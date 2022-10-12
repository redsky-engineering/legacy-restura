import React, { useEffect, useState } from 'react';
import './SchemaPreview.scss';
import { Box, Button, Label, rsToastify } from '@redskytech/framework/ui';
import serviceFactory from '../../services/serviceFactory';
import SchemaService from '../../services/schema/SchemaService';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState';
import { WebUtils } from '../../utils/utils';
import classNames from 'classnames';
import PageHeader from '../pageHeader/PageHeader';

interface SchemaPreviewProps {
	onClose: () => void;
	open: boolean;
}

const SchemaPreview: React.FC<SchemaPreviewProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);
	const [sqlStatements, setSqlStatements] = useState<string>('');

	useEffect(() => {
		Prism.highlightAll();
	}, [sqlStatements]);

	useEffect(() => {
		if (!schema) return;
		(async function getSchemaPreview() {
			try {
				const res = await schemaService.getSchemaPreview(schema);
				setSqlStatements(res);
			} catch (e) {
				rsToastify.error(WebUtils.getRsErrorMessage(e, 'Failed to submit schema.'), 'Submit Error');
			}
		})();
	}, [schema]);

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

	return (
		<Box className={classNames('rsSchemaPreview', { open: props.open })}>
			<PageHeader
				title={'Submit'}
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
			/>
			<Box padding={24}>
				<Label variant={'h6'} weight={'medium'} mb={8}>
					SQL Statements
				</Label>
				<pre>
					<code className={'sqlStatements language-sql'}>{sqlStatements}</code>
				</pre>
			</Box>
		</Box>
	);
};

export default SchemaPreview;
