const { MongoClient } = require('mongodb');
require('dotenv').config()
const ss = require('simple-statistics');

const criticalParameters = (usl, lsl, valueArray) => {
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
			// } else if (i > 0 && i < valueArray.length - 1 && (valueArray[i - 1] < value && valueArray[i + 1] < value)) {
			// deviations.push({ timestamp: timestampArray[i], model: modelArray[i], value: value, reason: "sudden peak" })
		}
	}

	return deviations
}

exports.process = async (configuration) => {
	const client = new MongoClient(process.env.DB_URL);
	try {
		await client.connect();
		const database = client.db(process.env.DB_NAME_2);

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

		const update = {};

		const filteredData = configuration.config.filter(obj => obj.machine.model === "EOL TESTING");
		for (let x = 0; x < filteredData.length; x++) {
			let id = filteredData[x]._id.toString()
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
					parameters[key] = {
						"raw-data": {
							"timestamp": timestampArray,
							"model": batchCodeArray,
							"operator": operatorArray,
							"shift": shiftArray,
							"status": resultArray,
							"data": parametersArray[key]
						},
						"calculations": parametersArray[key].length > 0 ? criticalParameters(element.usl, element.lsl, parametersArray[key]) : {},
						"deviations": parametersArray[key].length > 0 ? processDeviation(element.usl, element.lsl, parametersArray[key], timestampArray, batchCodeArray) : {}
					}
				}
			}

			update[`${id}.data.quality.inspection.control-charts`] = parameters;
			update[`${id}.parameters`] = filteredData[x].machine;
			update[`${id}.last-updated`] = new Date();
		}

		await database.collection('live').updateOne({ date: configuration.timestamp }, { $set: update }, { upsert: true });
		console.log("YWD | EOL TESTING | UPDATED | " + new Date())

	} finally {
		await client.close();
	}
}