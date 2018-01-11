#admin.py
#This file handles general admin functions.
#Copyright (C) 2017  Joshua Reed
#This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details. You should have received a copy of the GNU General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.

from the_root.decorators import admin_required
from the_root.extensions import db
from the_root import app
from the_root.decorators import render_template_standard

import flask
from flask_login import login_required, login_user, logout_user, current_user
from werkzeug.utils import secure_filename

import os

from flask import render_template, request, jsonify
	
@app.route("/admin", methods=['GET', 'POST'])
@login_required
@admin_required
def admin():
	return render_template_standard("/admin/admin.html")

	

#NOTE!!: If both GET and POST are not allowed, wtforms will trip a 405 error.
@app.route("/admin/gagfunc", methods=['GET', 'POST'])
@login_required
@admin_required
def device_create():
	pass