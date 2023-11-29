import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { GauzyAIService, ImageAnalysisResult } from '@gauzy/integration-ai';
import { IScreenshot, PermissionsEnum } from '@gauzy/contracts';
import { RequestContext } from './../../core/context';
import { TenantAwareCrudService } from './../../core/crud';
import { IntegrationTenantService } from './../../integration-tenant/integration-tenant.service';
import { Screenshot } from './screenshot.entity';

@Injectable()
export class ScreenshotService extends TenantAwareCrudService<Screenshot> {

	constructor(
		@InjectRepository(Screenshot) protected readonly screenshotRepository: Repository<Screenshot>,
		/** */
		private readonly _integrationTenantService: IntegrationTenantService,
		private readonly _gauzyAIService: GauzyAIService,
	) {
		super(screenshotRepository);
	}

	/**
	 * DELETE screenshot by ID
	 *
	 * @param criteria
	 * @param options
	 * @returns
	 */
	async deleteScreenshot(
		id: IScreenshot['id'],
		options?: FindOptionsWhere<Screenshot>
	): Promise<IScreenshot> {
		try {
			const tenantId = RequestContext.currentTenantId();
			const query = this.repository.createQueryBuilder(this.alias);
			query.setFindOptions({
				where: {
					...(
						(options) ? options : {}
					),
					id,
					tenantId
				}
			});
			if (!RequestContext.hasPermission(
				PermissionsEnum.CHANGE_SELECTED_EMPLOYEE
			)) {
				query.leftJoin(`${query.alias}.timeSlot`, 'time_slot');
				query.andWhere(`"time_slot"."employeeId" = :employeeId`, {
					employeeId: RequestContext.currentEmployeeId()
				});
			}
			const screenshot = await query.getOneOrFail();
			return await this.repository.remove(screenshot);
		} catch (error) {
			throw new ForbiddenException();
		}
	}

	/**
	 *
	 * @param callback
	 */
	async analyzeScreenshot(
		callback?: (analysis: ImageAnalysisResult[]) => void
	) {
		const analysis: ImageAnalysisResult[] = [];

		// Call the callback function if provided
		if (callback) {
			callback(analysis);
		}
	}
}
