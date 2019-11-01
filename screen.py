#!/usr/bin/env python3

import gi
import time
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

gi.require_version('Gtk', '3.0')
from gi.repository import Gtk

win = Gtk.Window(title="State window")
win.set_border_width(10)
sw = Gtk.Switch()
sw.set_active(True)
win.add(sw)

win.connect("destroy", Gtk.main_quit)
win.show_all()

PORT_NUMBER = 3001


# Server
class myHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(bytes("Path is {}\n".format(self.path), 'UTF8'))
        sw.set_state(self.path == '/on')
        return


def start_server():
    server = HTTPServer(('localhost', PORT_NUMBER), myHandler)
    print('Started httpserver on port ', PORT_NUMBER)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


th = threading.Thread(target=start_server)
th.daemon = True
th.start()

Gtk.main()
