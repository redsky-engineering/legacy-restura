import React, { useEffect, useState } from 'react';
import './SchemaPreview.scss';
import { Box, Button, Icon, Label, rsToastify } from '@redskytech/framework/ui';
import serviceFactory from '../../services/serviceFactory';
import SchemaService from '../../services/schema/SchemaService';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState';
import { ObjectUtils, WebUtils } from '../../utils/utils';
import classNames from 'classnames';
import PageHeader from '../pageHeader/PageHeader';
import { useOnClickOutsideRef } from '@redskytech/framework/hooks';

interface SchemaPreviewProps {
	onClose: () => void;
	open: boolean;
}

const SchemaPreview: React.FC<SchemaPreviewProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);
	const [schemaDiffs, setSchemaDiffs] = useState<Restura.SchemaPreview | undefined>();
	const [expand, setExpand] = useState<boolean>(false);

	const previewRef = useOnClickOutsideRef(() => {
		if (props.open) {
			setExpand(false);
			props.onClose();
		}
	});

	useEffect(() => {
		Prism.highlightAll();
	}, [schemaDiffs?.commands, expand]);

	useEffect(() => {
		if (!schema || !props.open) return;
		(async function getSchemaPreview() {
			try {
				const res = await schemaService.getSchemaPreview(schema);
				setSchemaDiffs(res);
			} catch (e) {
				rsToastify.error(WebUtils.getRsErrorMessage(e, 'Failed to submit schema.'), 'Submit Error');
			}
		})();
	}, [props.open]);

	async function submitSchema() {
		if (!schema) return;
		try {
			await schemaService.updateSchema(schema);
			props.onClose();
			rsToastify.success('Schema uploaded successfully', 'Success');
		} catch (e) {
			rsToastify.error(WebUtils.getRsErrorMessage(e, 'Failed to submit schema.'), 'Submit Error');
		}
	}

	function renderShrunk() {
		return (
			<>
				<Box className={'sectionBox'} padding={24}>
					<Label variant={'h6'} weight={'medium'} mb={8}>
						SQL Statements
					</Label>
					<Label variant={'body1'} weight={'regular'}>
						Changed
					</Label>
				</Box>
				<Box className={'sectionBox'} padding={24}>
					<Label variant={'h6'} weight={'medium'} mb={8}>
						Endpoints
					</Label>
					<Label variant={'body1'} weight={'regular'}>
						{schemaDiffs?.endPoints.length} Changed
					</Label>
				</Box>
				<Box className={'sectionBox'} padding={24}>
					<Label variant={'h6'} weight={'medium'} mb={8}>
						Global Parameters
					</Label>
					<Label variant={'body1'} weight={'regular'}>
						{schemaDiffs?.globalParams.length} Changed
					</Label>
				</Box>
				<Box className={'sectionBox'} padding={24}>
					<Label variant={'h6'} weight={'medium'} mb={8}>
						Roles
					</Label>
					<Label variant={'body1'} weight={'regular'}>
						{schemaDiffs?.roles.length} Changed
					</Label>
				</Box>
				<Box className={'sectionBox'} padding={24}>
					<Label variant={'h6'} weight={'medium'} mb={8}>
						Custom Types
					</Label>
					<Label variant={'body1'} weight={'regular'}>
						{schemaDiffs?.customTypes ? 'Changed' : 'No Change'}
					</Label>
				</Box>
			</>
		);
	}

	function renderExpanded() {
		return (
			<>
				<Box className={'sectionBox'} padding={24}>
					<Label variant={'h6'} weight={'medium'} mb={8}>
						SQL Statements
					</Label>
					<pre>
						<code className={'sqlStatements language-sql'}>{schemaDiffs?.commands}</code>
					</pre>
				</Box>
				{ObjectUtils.isArrayWithData(schemaDiffs?.endPoints) && (
					<Box className={'sectionBox'} padding={24}>
						<Label variant={'h6'} weight={'medium'} mb={8}>
							Endpoints
						</Label>
						<Box>
							{schemaDiffs?.endPoints.map((endpoint) => {
								return (
									<Box display={'flex'} alignItems={'center'} gap={24}>
										<Label variant={'body1'} weight={'regular'}>
											{endpoint.name}
										</Label>
										<Label variant={'caption1'} weight={'regular'}>
											{endpoint.changeType}
										</Label>
									</Box>
								);
							})}
						</Box>
					</Box>
				)}
				{ObjectUtils.isArrayWithData(schemaDiffs?.globalParams) && (
					<Box className={'sectionBox'} padding={24}>
						<Label variant={'h6'} weight={'medium'} mb={8}>
							Global Parameters
						</Label>
						<Box>
							{schemaDiffs?.globalParams.map((param) => {
								return (
									<Box display={'flex'} alignItems={'center'} gap={24}>
										<Label variant={'body1'} weight={'regular'}>
											{param.name}
										</Label>
										<Label variant={'caption1'} weight={'regular'}>
											{param.changeType}
										</Label>
									</Box>
								);
							})}
						</Box>
					</Box>
				)}
				{ObjectUtils.isArrayWithData(schemaDiffs?.roles) && (
					<Box className={'sectionBox'} padding={24}>
						<Label variant={'h6'} weight={'medium'} mb={8}>
							Roles
						</Label>
						<Box>
							{schemaDiffs?.roles.map((role) => {
								return (
									<Box display={'flex'} alignItems={'center'} gap={24}>
										<Label variant={'body1'} weight={'regular'}>
											{role.name}
										</Label>
										<Label variant={'caption1'} weight={'regular'}>
											{role.changeType}
										</Label>
									</Box>
								);
							})}
						</Box>
					</Box>
				)}
				{schemaDiffs?.customTypes && (
					<Box className={'sectionBox'} padding={24}>
						<Label variant={'h6'} weight={'medium'} mb={8}>
							Custom Types
						</Label>
						<Label variant={'body1'} weight={'regular'}>
							MODIFIED
						</Label>
					</Box>
				)}
			</>
		);
	}

	return (
		<Box
			className={classNames('rsSchemaPreview', { open: props.open, expand: expand })}
			elementRef={previewRef as React.RefObject<HTMLDivElement>}
		>
			<PageHeader
				title={'Preview'}
				rightNode={
					<Button
						look={'containedPrimary'}
						onClick={submitSchema}
						disabled={!schemaService.isSchemaChanged(schema)}
						small
					>
						Submit
					</Button>
				}
				leftNode={
					<Icon
						className={'expandShrink'}
						iconImg={expand ? 'icon-chevron-right' : 'icon-chevron-left'}
						onClick={() => setExpand((prev) => !prev)}
					/>
				}
			/>
			{expand ? renderExpanded() : renderShrunk()}
		</Box>
	);
};

export default SchemaPreview;
