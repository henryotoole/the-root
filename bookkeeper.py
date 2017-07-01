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

from flask import render_template, redirect, request, jsonify

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
		
		trans = Transaction(amt, income, type, method, srcdest = dest, desc = desc)
		db.session.add(trans)
		db.session.commit()
		#No user of that name.
		return redirect('/reginald?message=REGINALD SAYS HI!!!!')
	else:
		
		return render_template("/reginald/expenditure.html", form=form, sp_local=app.config['STATIC_URL_LOCAL'], sp_content=app.config['STATIC_URL_CONTENT'])
		
#

#Render a greensheet for the current user across a date range
#Dates in format DDMMYYYY
@app.route("/reginald/greensheet", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def greensheet():
	return render_template("/reginald/greensheet.html", sp_local=app.config['STATIC_URL_LOCAL'], sp_content=app.config['STATIC_URL_CONTENT'])


#Dates in format YYYY-MM-DD
@app.route("/reginald/greensheet/<query>", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def greensheet_query(query):
	if(query=='records_for_day'):
		date = request.values.get('date', type=str)
		if(date is None):
			return "Bad params", 404
		try:
			date = datetime.datetime.strptime(date + ' 23:59', "%Y-%m-%d %H:%M")
			date_end = date
			date_start = date - datetime.timedelta(days=1)
		except ValueError:
			return "Time format wrong", 415

		records = Transaction.query.filter_by(user=current_user.id).filter(Transaction.time<=date_end).filter(Transaction.time>=date_start).all()
		
		list = [record.getDict() for record in records]

		return jsonify(list), 200
	elif(query=='types'):
		types = Type.query.all()
		list = [type.getDict() for type in types]
		
		return jsonify(list), 200
#
















