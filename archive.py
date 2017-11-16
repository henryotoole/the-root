#archive.py
#A request handler for the archive portion of the site.

#So, to describe my vision for the archive... see the project entry.

from the_root import app

import flask, os
from flask import render_template, send_file, jsonify

from bs4 import BeautifulSoup

@app.route("/archive")
def archive():
	return render_template("/archive/archive.html", sp_local=app.config['STATIC_URL_LOCAL'], sp_content=app.config['STATIC_URL_CONTENT'])

#Mostly public methods
@app.route("/archive/query/<query>")
def archive_query(query):
	pass