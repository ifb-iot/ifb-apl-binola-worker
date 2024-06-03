const Telegraf = require('telegraf').Telegraf
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config()

const bot = new Telegraf('7276085424:AAFchGWWiP7M28bGjfTn5i9IS9giZUCmgOA')

async function fetchTelegramUsers() {
	return new Promise((resolve, reject) => {
		const client = new MongoClient(process.env.DB_URL);
		const connectToMongoDB = async () => {
			try {
				await client.connect();
				const db1 = client.db(process.env.DB_NAME_0);

				const issueTrackerData = await db1.collection('users')
					.find({ "notification.telegram.status": true })
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
					.find({ "notification.telegram": false })
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

const broadcastNotifications = async (issueList, telegramUsers) => {
	const updateFields = [];

	await Promise.all(issueList.map(async (issue) => {
		const issuePromises = telegramUsers.map(async (user) => {
			if (user.notification.telegram.status) {
				let issueNotification = issue.analysis["issue-name"].toUpperCase() + " in " + issue.parameter.split("-").join(" ").toUpperCase() + " has been observed on the " + issue.location + " for part having batch code of " + issue["batch-code"];
				let url = 'https://api.telegram.org/bot7276085424:AAFchGWWiP7M28bGjfTn5i9IS9giZUCmgOA/sendMessage?chat_id=' + user.notification.telegram.id + '&text=' + issueNotification;
				await fetch(url);

				updateFields.push({
					updateOne: {
						filter: { _id: new ObjectId(issue._id) },
						update: { $set: { 'notification.telegram': true } },
						upsert: true,
					}
				});
			}
		});
		return Promise.all(issuePromises);
	}));
	return updateFields;
};

exports.init = async () => {
	const client = new MongoClient(process.env.DB_URL);
	await client.connect();
	const database = client.db(process.env.DB_NAME_2);

	const telegramUsers = await fetchTelegramUsers();
	const issueList = await fetchIssueList()

	const bulkOperations = await broadcastNotifications(issueList, telegramUsers);
	if (bulkOperations.length > 0) {
		await database.collection('non-live').bulkWrite(bulkOperations)
		console.log("TELEGRAM NOTIFICATIONS | SENT | " + new Date())
	}

	bot.start((ctx) => {
		const chatId = ctx.chat.id
		const chatName = ctx.chat.first_name
		ctx.replyWithPhoto({ url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/IFB.png/250px-IFB.png' }, { caption: "Welcome to IFB-IoT chat bot " + chatName + " (" + chatId + ")" });
	})
}

bot.launch()
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))