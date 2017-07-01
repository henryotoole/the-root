#bookkeeper.py
#
#This service's name is Reginald. He keeps the books.
#
#Reginald takes GET/POST requests describing a purchase/transaction and adds them to a database. He can then provide some
#metrics about your spending habits, etc.

from the_root.extensions import db
from the_root import app
from the_root.forms import TransactionForm
from the_root.models import Transaction, Method, Type

import flask
from flask_login import login_required, current_user

from flask import render_template, redirect, request

import datetime

@app.route("/reginald", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def reginald_main():

	message = 'Reginald sighs. "You really should take better care of your finances"' # Default
	message = request.values.get('message', type=str, default=message)
	
	
	return render_template("/reginald/reginald.html", message=message, sp_local=app.config['STATIC_URL_LOCAL'], sp_content=app.config['STATIC_URL_CONTENT'])

@app.route("/reginald/transaction/<t_type>", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def reginald_transaction(t_type):
	form = TransactionForm()
	#Generate select field entries
	form.method.choices = [(m.id, m.name) for m in Method.query.all()]
	income = False
	if(t_type == 'income'):
		form.dest.label = 'Source'
		form.dest_optional.label = 'Source'
		form.type.choices = [(t.id, t.name) for t in Type.query.filter_by(income=True).all()]
		form.dest.choices = [(dest, dest) for dest in Transaction.get_common_srcdest(5, True)]
		income = True
	elif(t_type == 'expense'):
		form.dest.label = 'Recipient'
		form.dest_optional.label = 'Recipient'
		form.type.choices = [(t.id, t.name) for t in Type.query.filter_by(income=False).all()]
		form.dest.choices = [(dest, dest) for dest in Transaction.get_common_srcdest(5, False)]
	else:
		return '', 404
	form.dest.choices.append(('__OTHER__', 'Other')) # Add the 'other' option.
	if form.validate_on_submit():
		amt = form.amt.data
		
		method = form.method.data
		type = form.type.data # ID of type of transaction
		dest = form.dest.data # 
		if(dest == '__OTHER__'):
			dest = form.dest_optional.data
		desc = form.desc.data
		
		trans = Transaction(amt, income, type, srcdest = dest, desc = desc)
		db.session.add(trans)
		db.session.commit()
		#No user of that name.
		return redirect('/reginald?message=REGINALD SAYS HI!!!!')
	else:
		
		return render_template("/reginald/expenditure.html", form=form, sp_local=app.config['STATIC_URL_LOCAL'], sp_content=app.config['STATIC_URL_CONTENT'])
		
#

#Render a greensheet for the current user across a date range
@app.route("/reginald/greensheet", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def greensheet():
	date_start = request.values.get('date_start', type=str)
	date_end = request.values.get('date_end', type=str)
	

















