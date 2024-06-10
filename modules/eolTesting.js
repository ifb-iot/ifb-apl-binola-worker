const { MongoClient } = require('mongodb');
require('dotenv').config()
const ss = require('simple-statistics');

const criticalParameters = (usl, lsl, valueArray, date) => {
	const mean = ss.mean(valueArray);
	const min = ss.min(valueArray);
	const max = ss.max(valueArray);
	const standardDeviation = ss.standardDeviation(valueArray);

	let cp = (usl - lsl) / (6 * standardDeviation)
	let cpu = (usl - mean) / (3 * standardDeviation)
	let cpl = (mean - lsl) / (3 * standardDeviation)
	let cpk = Math.min(cpu, cpl)

	let controlLimit = ((usl - lsl) / 2) * 0.2
	let warningLimit = ((usl - lsl) / 2) * 0.6

	const data = {
		"date": date,
		"count": valueArray.length,
		"lsl": parseFloat(lsl).toFixed(2),
		"usl": parseFloat(usl).toFixed(2),
		"lcl": parseFloat(lsl + controlLimit).toFixed(2),
		"ucl": parseFloat(usl - controlLimit).toFixed(2),
		"lwl": parseFloat(lsl + warningLimit).toFixed(2),
		"uwl": parseFloat(usl - warningLimit).toFixed(2),
		"min": parseFloat(min).toFixed(2),
		"max": parseFloat(max).toFixed(2),
		"mean": parseFloat(mean).toFixed(2),
		"standard-deviation": parseFloat(standardDeviation).toFixed(2),
		"cp": parseFloat(cp).toFixed(2),
		"cpu": parseFloat(cpu).toFixed(2),
		"cpl": parseFloat(cpl).toFixed(2),
		"cpk": parseFloat(cpk).toFixed(2)
	}
	return data
}

const processDeviation = (usl, lsl, valueArray, timestampArray, modelArray) => {

	let controlLimit = ((usl - lsl) / 2) * 0.2
	let warningLimit = ((usl - lsl) / 2) * 0.6

	let lcl = parseFloat(lsl + controlLimit).toFixed(2)
	let ucl = parseFloat(usl - controlLimit).toFixed(2)

	let lwl = parseFloat(lsl + warningLimit).toFixed(2)
	let uwl = parseFloat(usl - warningLimit).toFixed(2)

	let deviations = []

	for (let i = 0; i < valueArray.length; i++) {
		let value = valueArray[i]

		if ((value < +lwl && value > +lcl) || (value > +uwl && value < +ucl)) {
			deviations.push({ timestamp: timestampArray[i], model: modelArray[i], value: value, reason: "warning" })
		} else if ((value < lcl && value > lsl) || (value > ucl && value < usl)) {
			deviations.push({ timestamp: timestampArray[i], model: modelArray[i], value: value, reason: "minor deviation" })
		} else if (value < lsl || value > usl) {
			deviations.push({ timestamp: timestampArray[i], model: modelArray[i], value: value, reason: "major deviation" })
		}
	}

	return deviations
}

exports.process = async (configuration) => {
	const client = new MongoClient(process.env.DB_URL);
	try {
		await client.connect();
		const database = client.db(process.env.DB_NAME_2);

		const update = {};
		let issueTrackerArray = []

		const filteredData = configuration.config.filter(obj => obj.machine.model === "EOL TESTING");
		for (let x = 0; x < filteredData.length; x++) {
			let id = filteredData[x]._id.toString()

			const timestampArray = []
			const batchCodeArray = []
			const operatorArray = []
			const shiftArray = []
			const resultArray = []

			const parametersArray = {
				"closing-speed": [],
				"opening-speed": [],
				"motor-current": []
			}

			const filteredIdSpecificRawData = configuration["raw-data"].filter(obj => obj.id === id);
			for (let y = 0; y < filteredIdSpecificRawData.length; y++) {
				const element = filteredIdSpecificRawData[y];
				for (let z = 0; z < element.data.length; z++) {
					const values = element.data[z];

					timestampArray.push(element.timestamp)
					batchCodeArray.push(values.BatchCode)
					operatorArray.push(values.Operator)
					shiftArray.push(values.ShiftTime)
					resultArray.push(values.Result)

					parametersArray["closing-speed"].push(values.CloseSpeed)
					parametersArray["opening-speed"].push(values.OpenSpeed)
					parametersArray["motor-current"].push(values.Current)
				}
			}

			const parameters = {}
			for (const key in configuration["process-config"][0].specifications[id]) {
				if (Object.hasOwnProperty.call(configuration["process-config"][0].specifications[id], key)) {
					const element = configuration["process-config"][0].specifications[id][key];
					const deviationList = parametersArray[key].length > 0 ? processDeviation(element.usl, element.lsl, parametersArray[key], timestampArray, batchCodeArray) : []
					const filteredDeviationList = deviationList.filter(item => item.reason !== "warning");

					const transformedArray = filteredDeviationList.map(content => ({
						"mapping": "issue-tracker",
						"type": "control-charts",
						"location": filteredData[x].machine.location,
						"batch-code": content.model,
						"parameter": key,
						"timestamp": new Date(content.timestamp),
						"updated": new Date(),
						"analysis": {
							"issue-name": content.reason,
							"root-cause": "",
							"corective-action": "",
							"person-responsible": [{
								name: "",
								email: ""
							}, {
								name: "",
								email: ""
							}],
							"target-date": "",
							"status": "PENDING",
							"remarks": ""
						},
						"notification": {
							"telegram": false,
							"email": false
						}
					}));

					parameters[key] = {
						"raw-data": {
							"timestamp": timestampArray,
							"model": batchCodeArray,
							"operator": operatorArray,
							"shift": shiftArray,
							"status": resultArray,
							"data": parametersArray[key]
						},
						"calculations": parametersArray[key].length > 0 ? criticalParameters(element.usl, element.lsl, parametersArray[key], configuration.timestamp) : {},
						"deviations": deviationList
					}
					issueTrackerArray = issueTrackerArray.concat(transformedArray)
				}
			}

			update[`${id}.data.quality.inspection.control-charts`] = parameters;
			update[`${id}.parameters`] = filteredData[x].machine;
			update[`${id}.last-updated`] = new Date();
		}

		const bulkOperations = issueTrackerArray.map(issue => ({
			updateOne: {
				filter: { 'batch-code': issue['batch-code'], parameter: issue.parameter },
				update: { $setOnInsert: issue },
				upsert: true,
			}
		}));

		await database.collection('live').updateOne({ date: configuration.timestamp }, { $set: update }, { upsert: true });
		bulkOperations.length > 0 ? await database.collection('non-live').bulkWrite(bulkOperations) : null

		console.log("EOL TESTING | UPDATED | " + new Date(configuration.timestamp))

	} finally {
		await client.close();
	}
}