"""Server Balap Bareng: menyajikan game (laptop) + kontrol (HP) dan menghubungkan sampai 4 HP ke game.

Pasang sekali:  pip install aiohttp cryptography
Jalankan:       python server.py
"""
import asyncio, datetime, ipaddress, json, os, socket, ssl, time
from aiohttp import web, WSMsgType

PORT = 8444
MAXP = 4
BASE = os.path.dirname(os.path.abspath(__file__))
games = set()
players = {}   # id -> {"ws","seen","name","token","q"}
tokens = {}    # token -> id
IP = "127.0.0.1"


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


def make_cert(ip):
    from cryptography import x509
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa

    d = os.path.join(BASE, "certs")
    os.makedirs(d, exist_ok=True)
    crt, key, tag = (os.path.join(d, n) for n in ("cert.pem", "key.pem", "ip.txt"))
    if all(os.path.exists(p) for p in (crt, key, tag)) and open(tag).read() == ip:
        return crt, key
    k = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "race-game")])
    now = datetime.datetime.now(datetime.timezone.utc)
    san = x509.SubjectAlternativeName([
        x509.DNSName("localhost"),
        x509.IPAddress(ipaddress.ip_address("127.0.0.1")),
        x509.IPAddress(ipaddress.ip_address(ip)),
    ])
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name)
            .public_key(k.public_key()).serial_number(x509.random_serial_number())
            .not_valid_before(now - datetime.timedelta(days=1))
            .not_valid_after(now + datetime.timedelta(days=365))
            .add_extension(san, False).sign(k, hashes.SHA256()))
    with open(crt, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))
    with open(key, "wb") as f:
        f.write(k.private_bytes(serialization.Encoding.PEM,
                                serialization.PrivateFormat.TraditionalOpenSSL,
                                serialization.NoEncryption()))
    with open(tag, "w") as f:
        f.write(ip)
    return crt, key


def alive(pid):
    p = players.get(pid)
    return bool(p) and (p["ws"] is not None or time.time() - p["seen"] < 4)


def assign(token, name):
    """Beri slot pemain (0-3). Token yang sama selalu dapat slot yang sama."""
    pid = tokens.get(token)
    if pid is not None and pid in players:
        players[pid]["name"] = name
        return pid
    pid = next((i for i in range(MAXP) if i not in players or not alive(i)), None)
    if pid is None:
        return None
    old = players.get(pid)
    if old:
        tokens.pop(old["token"], None)
    players[pid] = {"ws": None, "seen": time.time(), "name": name, "token": token, "q": []}
    tokens[token] = pid
    return pid


async def send_games(txt):
    for g in list(games):
        try:
            await g.send_str(txt)
        except Exception:
            games.discard(g)


async def push_roster():
    roster = [{"id": i, "name": p["name"], "alive": alive(i)} for i, p in players.items()]
    await send_games(json.dumps({"t": "roster", "players": roster}))


async def roster_loop():
    while True:
        await push_roster()
        await asyncio.sleep(1)


def to_phone(pid, txt, d):
    """Kirim pesan dari game ke HP: lewat WebSocket bila ada, kalau tidak masuk antrean (jalur cadangan)."""
    p = players.get(pid)
    if not p:
        return None
    if p["ws"] is not None:
        return p["ws"].send_str(txt)
    if d.get("t") == "st":
        p["q"] = [m for m in p["q"] if m.get("t") != "st"]
    p["q"].append(d)
    del p["q"][:-30]
    return None


async def ws_handler(req):
    ws = web.WebSocketResponse(heartbeat=20)
    await ws.prepare(req)
    role, pid = None, None
    async for m in ws:
        if m.type != WSMsgType.TEXT:
            continue
        try:
            d = json.loads(m.data)
        except ValueError:
            continue
        t = d.get("t")
        if t == "hello" and d.get("role") == "game":
            role = "game"
            games.add(ws)
            await push_roster()
        elif t == "hello" and d.get("role") == "player":
            pid = assign(str(d.get("token", ""))[:40], str(d.get("name", "Pemain"))[:14] or "Pemain")
            if pid is None:
                await ws.send_str('{"t":"full"}')
                continue
            role = "player"
            old = players[pid]["ws"]
            players[pid]["ws"] = ws
            players[pid]["seen"] = time.time()
            if old is not None and old is not ws:
                try:
                    await old.close()
                except Exception:
                    pass
            await ws.send_str(json.dumps({"t": "welcome", "id": pid}))
            await send_games(json.dumps({"t": "hello", "id": pid}))
            await push_roster()
        elif role == "player":
            d["id"] = pid
            await send_games(json.dumps(d))
        elif role == "game" and d.get("to") is not None:
            r = to_phone(d["to"], m.data, d)
            if r is not None:
                try:
                    await r
                except Exception:
                    pass
    if role == "game":
        games.discard(ws)
    elif role == "player" and pid in players and players[pid]["ws"] is ws:
        players[pid]["ws"] = None
        players[pid]["seen"] = time.time()
    return ws


async def http_join(req):
    try:
        d = await req.json()
    except ValueError:
        d = {}
    pid = assign(str(d.get("token", ""))[:40], str(d.get("name", "Pemain"))[:14] or "Pemain")
    if pid is None:
        return web.json_response({"full": True})
    players[pid]["seen"] = time.time()
    await send_games(json.dumps({"t": "hello", "id": pid}))
    await push_roster()
    return web.json_response({"id": pid})


async def http_in(req):
    try:
        pid = int(req.query.get("id", ""))
        msgs = json.loads(await req.text())
    except ValueError:
        return web.Response(text="x")
    if pid in players:
        players[pid]["seen"] = time.time()
        for d in msgs:
            d["id"] = pid
            await send_games(json.dumps(d))
    return web.Response(text="ok")


async def http_poll(req):
    try:
        pid = int(req.query.get("id", ""))
    except ValueError:
        return web.json_response([])
    p = players.get(pid)
    if not p:
        return web.json_response([])
    p["seen"] = time.time()
    out, p["q"] = p["q"], []
    return web.json_response(out)


def page(name, ctype=None):
    async def handler(_):
        h = {"Cache-Control": "no-store"}
        r = web.FileResponse(os.path.join(BASE, name), headers=h)
        if ctype:
            r.content_type = ctype
        return r
    return handler


def main():
    global IP
    IP = lan_ip()
    try:
        crt, key = make_cert(IP)
    except ImportError:
        raise SystemExit("Jalankan dulu: pip install aiohttp cryptography")
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(crt, key)

    async def info(_):
        return web.json_response({"url": "https://%s:%d/phone" % (IP, PORT)})

    async def on_start(app):
        app["roster"] = asyncio.create_task(roster_loop())

    app = web.Application()
    app.on_startup.append(on_start)
    app.router.add_get("/", page("index.html"))
    app.router.add_get("/phone", page("phone.html"))
    app.router.add_get("/physics.js", page("physics.js", "text/javascript"))
    app.router.add_get("/game.js", page("game.js", "text/javascript"))
    app.router.add_get("/api/info", info)
    app.router.add_get("/ws", ws_handler)
    app.router.add_post("/join", http_join)
    app.router.add_post("/in", http_in)
    app.router.add_get("/poll", http_poll)

    print("\n=== BALAP BARENG ===")
    print("Laptop : https://localhost:%d" % PORT)
    print("HP     : https://%s:%d/phone" % (IP, PORT))
    print("(Peringatan sertifikat: pilih Lanjutkan / Advanced > Proceed)\n")
    web.run_app(app, host="0.0.0.0", port=PORT, ssl_context=ctx, print=None)


if __name__ == "__main__":
    main()
