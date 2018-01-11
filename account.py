#account.py
#This file handles any pages dealing with accounts (login, create, etc)
#Copyright (C) 2017  Joshua Reed
#This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details. You should have received a copy of the GNU General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.


from the_root.extensions import login_manager, db
from the_root.forms import LoginForm, CreateForm
from the_root.models import User
from the_root import app
from the_root.decorators import render_template_standard

import flask
from flask_login import login_required, login_user, logout_user, current_user

from flask import render_template, send_file, jsonify, request, url_for

from urlparse import urlparse, urljoin

#Simply ensures that the supplied target url is the same as the host (i.e. is NOT redirecting to another site)
def is_safe_url(target):
	ref_url = urlparse(request.host_url)
	test_url = urlparse(urljoin(request.host_url, target))
	return test_url.scheme in ('http', 'https') and ref_url.netloc == test_url.netloc

#Looks through the request 'next' param and the referrer for a followthrough target after login. Return False if no suitable target,
#where a 'non-suitable' target is one which is not a safe url.
def get_redirect_target():
	for target in request.values.get('next'), request.referrer:
		if not target:
			continue
		if is_safe_url(target):
			return target
	return False

@login_manager.user_loader
def load_user(user_id):
	#Gets an instance of User based off a specific row of the database.
	return User.query.filter_by(id=user_id).first()
	

@app.route("/logout", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def logout():
	logout_user()
	return flask.redirect("/") 

#NOTE!!: If both GET and POST are not allowed, wtforms will trip a 405 error.
@app.route("/login", methods=['GET', 'POST'])
def login():
	if current_user.is_authenticated:
		return flask.redirect("/launcher")
	sp_local = app.config['STATIC_URL_LOCAL']
	loginform = LoginForm()
	message=""
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
				
				tgt = get_redirect_target()
				return flask.redirect(tgt if tgt else "/")
			else:
				message = "This combination of email and password is invalid."
		
		#No user of that name.
		message = "This combination of email and password is invalid."	
	return render_template_standard('login.html', loginform=loginform, message=message)

@app.route("/created", methods=['GET', 'POST'])
def created():
	return render_template_standard('created.html')
	
@app.route("/create", methods=['GET', 'POST'])
def create():
	sp_local = app.config['STATIC_URL_LOCAL']
	form = CreateForm()
	message=""
	if form.validate_on_submit():
		email = form.email_create.data
		if(User.query.filter_by(email=email).first()):
			message="That email is already in use."
		else:
			
			password = form.password.data
			user = User(password, email)
			db.session.add(user)
			db.session.commit()
			return flask.redirect("/created")
			
	return render_template_standard('create.html', form=form, message=message)

@app.route("/login/q/<query>", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def loginquery(query):
	if(query=='user'):
		return jsonify({'id': current_user.id}), 200
	return "Bad params", 404