const { MongoClient } = require('mongodb');
require('dotenv').config()

exports.initialize = async (index) => {
	return new Promise((resolve, reject) => {
		const client = new MongoClient(process.env.DB_URL);
		const connectToMongoDB = async () => {
			try {
				const currentDate = new Date();
				index === 0 ? currentDate.setHours(currentDate.getHours() - 7) : currentDate.setDate(currentDate.getDate() - index) // Subtract specific date to access backdated data
				currentDate.setHours(7, 0, 0, 0); // Set Shift start time as 7 am

				await client.connect();
				const db1 = client.db(process.env.DB_NAME_1);
				const db2 = client.db(process.env.DB_NAME_2);
				const dataConfig = await db1.collection('config')
					.find({ "status": true })
					.toArray();
				const processedDataConfig = await db2.collection('config')
					.find({})
					.toArray();
				const dataRawData = await db1.collection('raw-data')
					.find({
						timestamp: {
							$gte: new Date(currentDate), // Greater than or equal to the beginning of the day
							$lt: new Date(new Date(currentDate).getTime() + 24 * 60 * 60 * 1000) // Less than the beginning of the next day
						}
					})
					.sort({ timestamp: 1 }) // Sort data wrt timestamp in ascending order
					.toArray();

				resolve({
					"timestamp": new Date(currentDate),
					"config": dataConfig,
					"process-config": processedDataConfig,
					"raw-data": dataRawData
				})
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