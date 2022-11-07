import sqlEngine from './sqlEngine.js';
import { boundMethod } from 'autobind-decorator';
import cloneDeep from 'lodash.clonedeep';

class CompareSchema {
	@boundMethod
	async diffSchema(newSchema: Restura.Schema, latestSchema: Restura.Schema): Promise<Restura.SchemaPreview> {
		let endPoints = this.diffEndPoints(newSchema.endpoints[0].routes, latestSchema.endpoints[0].routes);
		let globalParams = this.diffStringArray(newSchema.globalParams, latestSchema.globalParams);
		let roles = this.diffStringArray(newSchema.roles, latestSchema.roles);

		let commands = '';
		if (JSON.stringify(newSchema.database) !== JSON.stringify(latestSchema.database))
			commands = await sqlEngine.diffDatabaseToSchema(newSchema);

		let customTypes = newSchema.customTypes !== latestSchema.customTypes;
		return { endPoints, globalParams, roles, commands, customTypes };
	}

	@boundMethod
	private diffStringArray(newArray: string[], originalArray: string[]): Restura.SchemaChangeValue[] {
		let stringsDiff: Restura.SchemaChangeValue[] = [];
		let originalClone = new Set(originalArray);
		newArray.forEach((item) => {
			let originalIndex = originalClone.has(item);
			if (!originalIndex) {
				stringsDiff.push({
					name: item,
					changeType: 'NEW'
				});
			} else {
				originalClone.delete(item);
			}
		});
		originalClone.forEach((item) => {
			stringsDiff.push({
				name: item,
				changeType: 'DELETED'
			});
		});
		return stringsDiff;
	}

	@boundMethod
	private diffEndPoints(
		newEndPoints: Restura.RouteData[],
		originalEndpoints: Restura.RouteData[]
	): Restura.SchemaChangeValue[] {
		let originalClone = cloneDeep(originalEndpoints);
		let diffObj: Restura.SchemaChangeValue[] = [];
		newEndPoints.forEach((endPoint) => {
			let { path, method } = endPoint;
			let endPointIndex = originalClone.findIndex((original) => {
				return original.path === endPoint.path && original.method === endPoint.method;
			});
			if (endPointIndex === -1) {
				diffObj.push({
					name: `${method} ${path}`,
					changeType: 'NEW'
				});
			} else {
				let original = originalClone.findIndex((original) => {
					return this.compareEndPoints(endPoint, original);
				});
				if (original === -1) {
					diffObj.push({
						name: `${method} ${path}`,
						changeType: 'MODIFIED'
					});
				}
				originalClone.splice(endPointIndex, 1);
			}
		});
		originalClone.forEach((original) => {
			let { path, method } = original;
			diffObj.push({
				name: `${method} ${path}`,
				changeType: 'DELETED'
			});
		});
		return diffObj;
	}

	@boundMethod
	private compareEndPoints(endPoint1: Restura.RouteData, endPoint2: Restura.RouteData): boolean {
		return JSON.stringify(endPoint1) === JSON.stringify(endPoint2);
	}
}

const compareSchema = new CompareSchema();
export default compareSchema;
