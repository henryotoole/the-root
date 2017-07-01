#This file handles login/landing page 

from the_root.extensions import login_manager, db
from the_root.forms import LoginForm, CreateForm
from the_root.models import User
from the_root import app

import flask
from flask_login import login_required, login_user, logout_user, current_user

from flask import render_template, send_file

@login_manager.user_loader
def load_user(user_id):
	#Gets an instance of User based off a specific row of the database.
	return User.query.filter_by(id=user_id).first()
	
@app.route("/")
def landing():
	return render_template("/landing.html", sp_local=app.config['STATIC_URL_LOCAL'], sp_content=app.config['STATIC_URL_CONTENT'])
	
@app.route("/robots.txt")
def robots():
	return send_file('robots.txt')


@app.route("/logout", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def logout():
	logout_user()
	print 'Logged out'
	return flask.redirect("/") 

#NOTE!!: If both GET and POST are not allowed, wtforms will trip a 405 error.
@app.route("/login", methods=['GET', 'POST'])
def login():
	sp_local = app.config['STATIC_URL_LOCAL']
	loginform = LoginForm()
	if loginform.validate_on_submit():
		email = loginform.email.data
		password = loginform.password.data
		
		#Encryption and stuff goes here
		
		#Get an instance
		user = User.query.filter_by(email=email).first()
		if user:
			if user.validate_password(password):
				#Check password, eventually
				login_user(user)
				
				
				return flask.redirect("/reginald")
			else:
				return "Bad password"
		
		#No user of that name.
		return "Not a valid account"
	#As one would expect, if there are form errors this will not be true.
	else:
		return render_template('login.html', loginform=loginform, sp_local=sp_local)

@app.route("/about")
def about():
	return render_template("/about.html", sp_local=app.config['STATIC_URL_LOCAL'], sp_content=app.config['STATIC_URL_CONTENT'])