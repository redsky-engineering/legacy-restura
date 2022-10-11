import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import './AutoComplete.scss';
import { Box, InputText, Label } from '@redskytech/framework/ui';
import classNames from 'classnames';

interface AutoCompleteProps {
	options: string[];
	startSymbol: string;
	value: string;
	onChange: (newValue: string, event?: ChangeEvent<HTMLInputElement>) => void;
}

const AutoComplete: React.FC<AutoCompleteProps> = (props) => {
	const [selectedIndex, setSelectedIndex] = useState<number>(0);
	const [filter, setFilter] = useState<string>('');
	const [filteredOptions, setFilteredOptions] = useState<string[]>(props.options);
	const [words, setWords] = useState<string[]>(props.value.split(' '));
	const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

	useEffect(() => {
		let newWords = props.value.split(' ');
		if (newWords[newWords.length - 1].startsWith(props.startSymbol)) {
			setFilter(newWords[newWords.length - 1]);
		}
		setWords(newWords);
	}, [props.value]);

	useEffect(() => {
		setFilteredOptions(() => {
			const filtered = props.options.filter((option) => option.toLowerCase().startsWith(filter.toLowerCase()));
			setSelectedIndex((prev) => {
				if (filtered.length - 1 > prev) {
					return 0;
				}
				return prev;
			});
			return filtered;
		});
	}, [filter, props.options]);

	function autoComplete(word: string) {
		let wordsCopy = [...words];
		wordsCopy.splice(-1, 1, word);
		const newValue = `${wordsCopy.join(' ')}`;
		props.onChange(newValue);
	}

	function renderAutoComplete() {
		return (
			<Box className={'rsAutoComplete'}>
				{filteredOptions.map((option, index) => {
					return (
						<Label
							key={index}
							className={classNames({ highlighted: index === selectedIndex })}
							variant={'body1'}
							weight={'regular'}
							onClick={() => {
								autoComplete(option);
							}}
						>
							{option}
						</Label>
					);
				})}
			</Box>
		);
	}

	return (
		<Box className={'customJoin'}>
			<InputText
				inputMode={'text'}
				value={props.value}
				onChange={props.onChange}
				onFocus={() => setShowSuggestions(true)}
				onBlur={() => setShowSuggestions(false)}
				onKeyDown={(event) => {
					if (event.key === 'Enter' || event.key === 'Tab') {
						event.preventDefault();
						autoComplete(filteredOptions[selectedIndex]);
					}
					if (event.key === 'ArrowDown') {
						event.stopPropagation();
						event.preventDefault();
						setSelectedIndex((prev) => {
							if (prev + 1 >= filteredOptions.length) {
								return 0;
							}
							return prev + 1;
						});
					}
					if (event.key === 'ArrowUp') {
						event.stopPropagation();
						event.preventDefault();
						setSelectedIndex((prev) => {
							if (prev - 1 < 0) {
								return filteredOptions.length - 1;
							}
							return prev - 1;
						});
					}
				}}
			/>
			{showSuggestions &&
				words[words.length - 1].startsWith(props.startSymbol) &&
				!props.options.includes(words[words.length - 1]) &&
				renderAutoComplete()}
		</Box>
	);
};

export default AutoComplete;
