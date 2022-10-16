/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {Button, ComboBox, Input, Item, Label, ListBox, Popover, Text} from '../';
import React from 'react';
import {render, within} from '@react-spectrum/test-utils';
import userEvent from '@testing-library/user-event';

describe('ComboBox', () => {
  it('provides slots', () => {
    let {getByRole} = render(
      <ComboBox defaultInputValue="C">
        <Label>Favorite Animal</Label>
        <Input />
        <Button />
        <Text slot="description">Description</Text>
        <Text slot="errorMessage">Error</Text>
        <Popover>
          <ListBox>
            <Item>Cat</Item>
            <Item>Dog</Item>
            <Item>Kangaroo</Item>
          </ListBox>
        </Popover>
      </ComboBox>
    );

    let input = getByRole('combobox');
    expect(input).toHaveValue('C');
    expect(input.closest('.react-aria-ComboBox')).toBeInTheDocument();

    expect(input).toHaveAttribute('aria-labelledby');
    let label = document.getElementById(input.getAttribute('aria-labelledby').split(' ')[0]);
    expect(label).toHaveAttribute('class', 'react-aria-Label');
    expect(label).toHaveTextContent('Favorite Animal');

    expect(input).toHaveAttribute('aria-describedby');
    expect(input.getAttribute('aria-describedby').split(' ').map(id => document.getElementById(id).textContent).join(' ')).toBe('Description Error');
  
    let button = getByRole('button');
    userEvent.click(button);

    let listbox = getByRole('listbox');
    expect(listbox).toHaveAttribute('class', 'react-aria-ListBox');
    expect(listbox.closest('.react-aria-Popover')).toBeInTheDocument();

    let options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(3);

    userEvent.click(options[1]);
    expect(input).toHaveValue('Dog');
  });
});