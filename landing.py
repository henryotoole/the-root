#This file handles login/landing page 

from the_root.extensions import login_manager, db
from the_root.forms import LoginForm, CreateForm
from the_root.models import User
from the_root import app

import flask
from flask_login import login_required, login_user, logout_user, current_user

from flask import render_template, send_file
	
@app.route("/")
def landing():
	return render_template("/landing.html", sp_local=app.config['STATIC_URL_LOCAL'], sp_content=app.config['STATIC_URL_CONTENT'])
	
@app.route("/robots.txt")
def robots():
	return send_file('robots.txt')

@app.route("/about")
def about():
	return render_template("/about.html", sp_local=app.config['STATIC_URL_LOCAL'], sp_content=app.config['STATIC_URL_CONTENT'])
	
#The main launcher page with the app listing.
@app.route("/launcher", methods=['GET', 'POST'])
def launcher():
	return render_template("/launcher.html", sp_local=app.config['STATIC_URL_LOCAL'], sp_content=app.config['STATIC_URL_CONTENT'])