import * as React from 'react';
import './SubmitPage.scss';
import { Page } from '@redskytech/framework/996';
import { useEffect, useState } from 'react';
import serviceFactory from '../../services/serviceFactory.js';
import SchemaService from '../../services/schema/SchemaService.js';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState.js';
import { Box, Button, InputTextarea, Label, rsToastify } from '@redskytech/framework/ui';
import PageHeader from '../../components/pageHeader/PageHeader.js';
import { WebUtils } from '../../utils/utils.js';

interface SubmitPageProps {}

declare var Prism: any;

const SubmitPage: React.FC<SubmitPageProps> = (props) => {
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
			rsToastify.success('Schema uploaded successfully', 'Success');
		} catch (e) {
			rsToastify.error(WebUtils.getRsErrorMessage(e, 'Failed to submit schema.'), 'Submit Error');
		}
	}

	return (
		<Page className={'rsSubmitPage'}>
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
		</Page>
	);
};

export default SubmitPage;
