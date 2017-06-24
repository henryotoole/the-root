#This file handles login/landing page 

from luxedo.extensions import login_manager, db
from luxedo.forms import LoginForm, CreateForm
from luxedo.models import User
from luxedo import app

import flask
from flask_login import login_required, login_user, logout_user, current_user

from flask import render_template, send_file

@login_manager.user_loader
def load_user(user_id):
	#Gets an instance of User based off a specific row of the database.
	return User.query.filter_by(id=user_id).first()
	
@app.route("/")
def landing():
	return render_template("/landing.html")
	
@app.route("/robots.txt")
def robots():
	return send_file('robots.txt')
	

#NOTE!!: If both GET and POST are not allowed, wtforms will trip a 405 error.
@app.route("/login", methods=['GET', 'POST'])
def login():
	sp_local = app.config['STATIC_URL_LOCAL']
	loginform = LoginForm()
	createform = CreateForm()
	if loginform.email.data and loginform.validate_on_submit():
		email = loginform.email.data
		password = loginform.password.data
		
		#Encryption and stuff goes here
		
		#Get an instance
		user = User.query.filter_by(email=email).first()
		if user:
			if user.validate_password(password):
				#Check password, eventually
				login_user(user)
				return flask.redirect("/workspace")
			else:
				return "Bad password"
		
		#No user of that name.
		return "Not a valid account"
	#As one would expect, if there are form errors this will not be true.
	elif createform.email_create.data and createform.validate_on_submit():
		if(app.config.get('DISALLOW_ACCOUNT_CREATE', None)): # If account creation is disabled (pre launch)
			return render_template('create_disallowed.html', sp_local=sp_local)
		#Perform registration.
		newuser = User(createform.password.data, createform.email_create.data)
		db.session.add(newuser)
		db.session.commit()
		return render_template('created.html', sp_local=sp_local)
	else:
		return render_template('login.html', loginform=loginform, createform=createform, sp_local=sp_local)

@app.route("/logged_in")
@login_required
def logintest():
	print current_user
	return "I'm in."
	
@app.route("/logout")
@login_required
def logout():
	logout_user()
	return "Logged out"