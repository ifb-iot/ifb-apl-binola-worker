const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config()

const mailer = require('../mailer')

async function fetchMailUsers() {
	return new Promise((resolve, reject) => {
		const client = new MongoClient(process.env.DB_URL);
		const connectToMongoDB = async () => {
			try {
				await client.connect();
				const db1 = client.db(process.env.DB_NAME_0);

				const issueTrackerData = await db1.collection('users')
					.find({
						"notification.email.status": true,
						$or: [
							{ "notification.email.role.production-supervisor": true },
							{ "notification.email.role.quality-supervisor": true },
							{ "notification.email.role.iiot-head": true }
						]
					})
					.toArray();
				resolve(issueTrackerData)
			}
			catch (error) {
				reject(error)
			}
			finally {
				await client.close();
			}
		}
		connectToMongoDB().catch(console.error);
	})
}

async function fetchIssueList() {
	return new Promise((resolve, reject) => {
		const client = new MongoClient(process.env.DB_URL);
		const connectToMongoDB = async () => {
			try {
				await client.connect();
				const db1 = client.db(process.env.DB_NAME_2);

				const issueTrackerData = await db1.collection('non-live')
					.find({ "notification.email": false })
					.toArray();
				resolve(issueTrackerData)
			}
			catch (error) {
				reject(error)
			}
			finally {
				await client.close();
			}
		}
		connectToMongoDB().catch(console.error);
	})
}


const generateMailBody = (issueList) => {

	let url = "http://localhost:3001/quality/control-charts/deviation"

	const html = `<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">
		<style>
		p { font-size: 16px }
		</style>
		<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js" integrity="sha384-JjSmVgyd0p3pXB1rRibZUAYoIIy6OrQ6VrjIEaFf/nJGzIxFDsf4x0xIM+B07jRM" crossorigin="anonymous"></script>
		<table width="100%">
			<tr>
				<td width="5%">&nbsp;</td>
				<td width="90%">
					<table width="100%" border="0">
						<tr>
							<td width="50%" style="text-align:left">
								<img src="http://www.ifbindustries.com/images/logo.png" alt="IFB Logo">
							</td>
							<td width="50%" style="text-align:right">&nbsp;</td>
						</tr>
					</table>
				</td>
				<td width="5%">&nbsp;</td>
			</tr>
			<tr>
				<td>&nbsp;</td>
				<td>&nbsp;</td>
				<td>&nbsp;</td>
			</tr>
			<tr>
				<td>&nbsp;</td>
				<td style="background-color:red">&nbsp;</td>
				<td>&nbsp;</td>
			</tr>
			<tr>
				<td>&nbsp;</td>
				<td>&nbsp;</td>
			</tr>
			<tr>
				<td>&nbsp;</td>
				<td>
					<table width="100%" border="0">
						<tr>
							<td>&nbsp;</td>
							<td>
								<h3><b>${issueList[0].analysis["issue-name"].toUpperCase()} observed for following parts:</b></h3>
							</td>
						</tr>
						<tr>
							<td>&nbsp;</td>
							<td>&nbsp;</td>
							<td>&nbsp;</td>
						</tr>
					</table>
				<td>&nbsp;</td>
			</tr>
			<tr>
				<td style="width:5%">&nbsp;</td>
				<td style="width:90%">
					<table width="100%" class="myClass" style="border-collapse:collapse">
						<thead>
							<tr>
								<th style="border:1px solid #000;padding:8px;text-align:center">Location</th>
								<th style="border:1px solid #000;padding:8px;text-align:center">Timestamp</th>
								<th style="border:1px solid #000;padding:8px;text-align:center">Batch Code</th>
								<th style="border:1px solid #000;padding:8px;text-align:center">Parameter</th>
								<th style="border:1px solid #000;padding:8px;text-align:center">Issue Tracker</th>
							</tr>
						</thead>
						<tbody style="font-size: 16px">
							${issueList.map(item => `
							<tr>
								<td style="border: 1px solid #ddd;padding: 8px;text-align:center">${item.location}</td>
								<td style="border: 1px solid #ddd;padding: 8px;text-align:center">${item.timestamp.toString().slice(4, 24)}</td>
								<td style="border: 1px solid #ddd;padding: 8px;text-align:center">${item['batch-code']}</td>
								<td style="border: 1px solid #ddd;padding: 8px;text-align:center">${item.parameter}</td>
								<td style="border: 1px solid #ddd;padding: 8px;text-align:center"><a href="http://172.23.61.92/quality/control-charts/issue-tracker?batch-code=${item['batch-code']}&parameter=${item.parameter}&reason=${item.analysis["issue-name"].toUpperCase()}">Link</a></td>
							</tr>`).join('')}
						</tbody>
					</table>
				</td>
				<td style="width:5%">&nbsp;</td>
			</tr>
			<tr>
				<td>&nbsp;</td>
				<td>&nbsp;</td>
				<td>&nbsp;</td>
			</tr>
			<tr>
				<td>&nbsp;</td>
				<td>&nbsp;</td>
				<td>&nbsp;</td>
			</tr>
			<tr>
				<td>&nbsp;</td>
				<td>&nbsp;</td>
				<td>&nbsp;</td>
			</tr>
			<tr>
				<td>&nbsp;</td>
				<td>
					<h4>
					<p>From, <br>
					<strong>IFB Industries Limited</strong></p>
					</h4>
				</td>
				<td>&nbsp;</td>
			</tr>
			<tr>
				<td>&nbsp;</td>
				<td>&nbsp;</td>
				<td>&nbsp;</td>
			</tr>
			<tr>
				<td>&nbsp;</td>
				<td>&nbsp;</td>
				<td>&nbsp;</td>
			</tr>
			<tr>
				<td>&nbsp;</td>
				<td>
					<p style="text-align:center">Please do not reply to this email because we are not monitoring this inbox.</p>
				</td>
				<td>&nbsp;</td>
			</tr>
			<tr>
				<td>&nbsp;</td>
				<td style="background-color:red">&nbsp;</td>
				<td>&nbsp;</td>
			</tr>
			<tr>
				<td>&nbsp;</td>
				<td>
					<p style="text-align:center">Copyright © 2024 <span style="font-family:Stencil;font-weight:400">IFB</span>. All rights reserved.</p>
				</td>
				<td>&nbsp;</td>
			</tr>
			<tr>
				<td>&nbsp;</td>
				<td>&nbsp;</td>
				<td>&nbsp;</td>
			</tr>
		</table>`;
	return html
}

const broadcastNotifications = async (issueList, mailUsers) => {
	const htmlBody = generateMailBody(issueList)
	mailer.autoMailer(mailUsers.join(), "", issueList[0].analysis["issue-name"].toUpperCase() + " OBSERVED", htmlBody)
	const updateFields = issueList.map(issue => ({
		updateOne: {
			filter: { _id: new ObjectId(issue._id) },
			update: { $set: { 'notification.email': true } },
			upsert: true,
		}
	}));
	return updateFields;
};

exports.init = async () => {
	const client = new MongoClient(process.env.DB_URL);
	await client.connect();
	const database = client.db(process.env.DB_NAME_2);

	const mailUsers = await fetchMailUsers();
	const mailIdArray = mailUsers.map(obj => obj.email)

	const issueList = await fetchIssueList()
	const minorDeviation = issueList.filter(obj => obj.analysis["issue-name"] === "minor deviation")
	const majorDeviation = issueList.filter(obj => obj.analysis["issue-name"] === "major deviation")

	const updateMinorDeviations = await broadcastNotifications(minorDeviation.length <= 4 ? minorDeviation : minorDeviation.slice(0, 4), mailIdArray);
	const updateMajorDeviations = await broadcastNotifications(majorDeviation.length <= 4 ? majorDeviation : majorDeviation.slice(0, 4), mailIdArray);
	updateMinorDeviations.length > 0 ? await database.collection('non-live').bulkWrite(updateMinorDeviations) : null
	updateMajorDeviations.length > 0 ? await database.collection('non-live').bulkWrite(updateMajorDeviations) : null
	console.log("EMAIL NOTIFICATIONS | " + new Date())
}