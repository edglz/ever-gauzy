import { Component, OnInit } from '@angular/core';
import { IProductOptionTranslatable, LanguagesEnum } from '@gauzy/contracts';
import { Router } from '@angular/router';
import { InventoryStore } from 'apps/gauzy/src/app/@core/services/inventory-store.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store, TranslatableService } from 'apps/gauzy/src/app/@core';

export interface OptionCreateInput {
	name: string;
	code: string;
}

export interface VariantCreateInput {
	options: string[];
	optionsFull: IProductOptionTranslatable[];
	isStored: boolean;
	id?: string;
	productId?: string;
}

@UntilDestroy()
@Component({
	selector: 'ngx-variant-form',
	templateUrl: './variant-form.component.html',
	styleUrls: ['./variant-form.component.scss']
})
export class VariantFormComponent implements OnInit {
	options: IProductOptionTranslatable[] = [];
	optionsSelect: String[] = [];

	variantCreateInputs: VariantCreateInput[] = [];
	editVariantCreateInput: VariantCreateInput = {
		optionsFull: [],
		options: [],
		isStored: false
	};
	mode = 'create';
	languageCode: string = LanguagesEnum.ENGLISH;

	constructor(
		private translatableService: TranslatableService,
		private router: Router,
		private inventoryStore: InventoryStore,
		private store: Store
	) {}

	ngOnInit(): void {
		this.inventoryStore.optionGroups$
			.pipe(untilDestroyed(this))
			.subscribe((optionGroups) => {
				this.options = [];
				optionGroups.forEach((optionGroup) => {
					this.options.push(...optionGroup.options);
				});
				this.optionsSelect = this.options.map((opt) => opt.name);
				this.editVariantCreateInput = {
					...this.editVariantCreateInput,
					optionsFull: this.options
				};
			});

		this.inventoryStore.variantCreateInputs$
			.pipe(untilDestroyed(this))
			.subscribe((variantCreateInputs) => {
				this.variantCreateInputs = variantCreateInputs;
			});

		this.store.preferredLanguage$
			.pipe(untilDestroyed(this))
			.subscribe(async () => {
				this.options = await Promise.all(
					this.options.map(async (option) => {
						return Promise.resolve(
							this.translatableService.getTranslated(option, [
								'name'
							])
						);
					})
				);
				this.optionsSelect = this.options.map((opt) => opt.name);
				this.editVariantCreateInput = {
					...this.editVariantCreateInput,
					optionsFull: this.options
				};
			});
	}

	onSelectOption(selectedOptions: string[]) {
		this.editVariantCreateInput.options = selectedOptions;

		if (selectedOptions.length === 0) {
			this.variantCreateInputs = this.variantCreateInputs.filter(
				(variant) => variant.options.length > 0
			);
			this.resetCreateVariantInputForm();
		}
	}

	onEditProductVariant(variantCreateInput: VariantCreateInput) {
		this.editVariantCreateInput = variantCreateInput;
		this.mode = 'edit';
	}

	onSaveVariant() {
		if (
			this.mode === 'create' &&
			!this.optionCombinationAlreadySelected()
		) {
			this.inventoryStore.addVariantCreateInput(
				this.editVariantCreateInput
			);
		}

		this.resetCreateVariantInputForm();
	}

	resetCreateVariantInputForm() {
		this.mode = 'create';
		this.editVariantCreateInput = {
			options: [],
			optionsFull: this.options,
			isStored: false
		};
	}

	optionCombinationAlreadySelected() {
		let result = false;

		this.variantCreateInputs.forEach((variant) => {
			const check = this.editVariantCreateInput.options.every(
				(elemCheck) => {
					return (
						variant.options.indexOf(elemCheck) > -1 &&
						variant.options.length ===
							this.editVariantCreateInput.options.length
					);
				}
			);

			if (check) result = true;
		});

		return result;
	}

	getVariantDisplayName(variantCreateInput: VariantCreateInput) {
		if (!variantCreateInput.options.length) return '-';
		return variantCreateInput.optionsFull.map((opt) => opt.name).join(' ');
	}

	onVariantBtnClick(variantCreateInput: VariantCreateInput) {
		const { id, productId } = variantCreateInput;

		if (!variantCreateInput.isStored) {
			this.onEditProductVariant(variantCreateInput);
			return;
		}

		if (productId && id) {
			this.router.navigate([
				`/pages/organization/inventory/${productId}/variants/${id}`
			]);
		}
	}
}
