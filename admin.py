#This file handles general admin functions.

from the_root.decorators import admin_required
from the_root.extensions import db
from the_root import app

import flask
from flask_login import login_required, login_user, logout_user, current_user
from werkzeug.utils import secure_filename

import os

from flask import render_template, request, jsonify
	
@app.route("/admin", methods=['GET', 'POST'])
@login_required
@admin_required
def admin():
	return render_template("/admin/admin.html")

	

#NOTE!!: If both GET and POST are not allowed, wtforms will trip a 405 error.
@app.route("/admin/gagfunc", methods=['GET', 'POST'])
@login_required
@admin_required
def device_create():
	pass