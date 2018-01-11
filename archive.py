#archive.py
#A request handler for the archive portion of the site.
#Copyright (C) 2017  Joshua Reed
#This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details. You should have received a copy of the GNU General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.


#So, to describe my vision for the archive... see the project entry.

from the_root import app
from the_root.decorators import render_template_standard

import flask, os
from flask import render_template, send_file, jsonify

from bs4 import BeautifulSoup

@app.route("/archive")
def archive():
	return render_template_standard("/archive/archive.html")

#Mostly public methods
@app.route("/archive/query/<query>")
def archive_query(query):
	pass