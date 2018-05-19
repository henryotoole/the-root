#bookkeeper.py
#
#This service's name is Reginald. He keeps the books.
#
#Reginald takes GET/POST requests describing a purchase/transaction and adds them to a database. He can then provide some
#metrics about your spending habits, etc.
#Copyright (C) 2017  Joshua Reed
#This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details. You should have received a copy of the GNU General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.


from the_root.extensions import db
from the_root import app
from the_root.forms import TransactionForm
from the_root.models import Transaction, Method, Type
from the_root.decorators import render_template_standard

import flask
from flask_login import login_required, current_user

from flask import render_template, redirect, request, jsonify

import datetime, time

@app.route("/reginald", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def reginald_main():

	message = 'Reginald sighs. "You really should take better care of your finances"' # Default
	message = request.values.get('message', type=str, default=message)
	
	
	return render_template_standard("/reginald/reginald.html", message=message)

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
		postdate = form.postdate.data
		
		trans = Transaction(amt, income, type, method, srcdest = dest, desc = desc)
		if form.postdate_enable.data:
			trans.time = postdate
			print "Postdating"
		db.session.add(trans)
		db.session.commit()
		#No user of that name.
		return redirect('/reginald?message=REGINALD SAYS HI!!!!')
	else:
		
		return render_template_standard("/reginald/expenditure.html", form=form)
		
#

#Render a greensheet for the current user across a date range
#Dates in format DDMMYYYY
@app.route("/reginald/greensheet", methods=['GET', 'POST'])
@login_required # This must ALWAYS go below the route decorator! Otherwise anyn users can log in
def greensheet():
	return render_template_standard("/reginald/greensheet.html")


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
		except ValueError:
			return "Time format wrong", 415

		list = Transaction.getDate(date)

		return jsonify(list), 200
	elif(query=='types'):
		types = Type.query.all()
		list = [type.getDict() for type in types]
		
		return jsonify(list), 200
	elif(query=='update_record'):
		date = request.values.get('date', type=str) # Full date string expected, format YYYY-MM-DD hh:mm
		type = request.values.get('type', type=int) # ID of transaction type
		desc = request.values.get('desc', type=str) # Text of description
		amt = request.values.get('amt', type=float) # Dollar amount of purchase
		id = request.values.get('id', type=int) # The ID of the transaction, only thing that is required.
		if(id is None):
			return "Transaction ID not provided", 404
		trans = Transaction.query.filter_by(user=current_user.id).filter_by(id=id).first()
		if(trans is None):
			return "Access denied!", 403
		if(date):
			try:
				date_obj = datetime.datetime.strptime(date, "%Y-%m-%d %H:%M")
				trans.time = date_obj
			except ValueError:
				return "Time format wrong", 415
		if(type):
			trans.type = type
		if(desc):
			trans.desc = desc
		if(amt):
			trans.amt = amt
		db.session.commit()
		return jsonify({}), 200
	elif(query=='delete'):
		id = request.values.get('id', type=int) # The ID of the transaction, only thing that is required.
		if(id is None):
			return "Transaction ID not provided", 404
		trans = Transaction.query.filter_by(user=current_user.id).filter_by(id=id).first()
		if(trans is None):
			return "Access denied!", 403
		db.session.delete(trans)
		db.session.commit()
		return jsonify({}), 200
	#Note: It's best to get multiple in one request for A) performance reasons and B) to make it easier to order them server-side.
	#This will return a list of lists of records for EVERY DAY IN THE RANGE, meaning empty arrays are returned for days with no records.
	elif(query=='records_for_range'):
		#Note: Dates can be in either order, but must be in YYYY-MM-DD format.
		date1 = request.values.get('date1', type=str)
		date2 = request.values.get('date2', type=str)
		date_start = None
		date_end = None
		if(date1 is None or date2 is None):
			return "Bad params", 404
		try:
			date1 = datetime.datetime.strptime(date1 + ' 23:59', "%Y-%m-%d %H:%M")
			date2 = datetime.datetime.strptime(date2 + ' 23:59', "%Y-%m-%d %H:%M")
			#Ensure date_start is chronologically before date_end
			if(date1 < date2):
				date_start = date1
				date_end = date2
			else:
				date_start = date2
				date_end = date1
		except ValueError:
			return "Time format wrong", 415
		#Empty list of days to populate (in order)
		days = []
		
		#Loop through every day in the range.
		delta = datetime.timedelta(days=1)
		d = date_start
		while d <= date_end:
			days.append(Transaction.getDate(d))
			d += delta
		
		data = {'days': days, 'balance_at_start': str(Transaction.getBalanceUpTo(date_start))}
		return jsonify(data), 200
	elif(query=='daterange_all'): # Get start and end dates of entire body of records.
		start = Transaction.query.filter_by(user=current_user.id).order_by(Transaction.time.desc()).first().time
		end = Transaction.query.filter_by(user=current_user.id).order_by(Transaction.time.asc()).first().time
		data = {
			'start': datetime.datetime.strftime(start, '%Y-%m-%d'),
			'end': datetime.datetime.strftime(end, '%Y-%m-%d')
		}
		return jsonify(data), 200
	#Sum every transaction for a user and return the balance
	elif(query=='total_balance'):
		return jsonify(str(Transaction.getBalance())), 200
		
	return "Bad params", 404
#
















