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

import {Button, CalendarCell, CalendarGrid, DateInput, DateRangePicker, DateSegment, Dialog, Group, Heading, Label, Popover, RangeCalendar, Text} from 'react-aria-components';import React from 'react';
import {render} from '@react-spectrum/test-utils';
import userEvent from '@testing-library/user-event';

describe('DateRangePicker', () => {
  it('provides slots', () => {
    let {getByRole, getAllByRole} = render(
      <DateRangePicker>
        <Label>Trip dates</Label>
        <Group>
          <DateInput slot="start">
            {(segment) => <DateSegment segment={segment} />}
          </DateInput>
          <span aria-hidden="true">–</span>
          <DateInput slot="end">
            {(segment) => <DateSegment segment={segment} />}
          </DateInput>
          <Button>▼</Button>
        </Group>
        <Text slot="description">Description</Text>
        <Text slot="errorMessage">Error</Text>
        <Popover>
          <Dialog>
            <RangeCalendar>
              <header>
                <Button slot="previous">◀</Button>
                <Heading />
                <Button slot="next">▶</Button>
              </header>
              <CalendarGrid>
                {(date) => <CalendarCell date={date} />}
              </CalendarGrid>
            </RangeCalendar>
          </Dialog>
        </Popover>
      </DateRangePicker>
    );

    let group = getByRole('group');
    let inputs = group.querySelectorAll('.react-aria-DateInput');
    let button = getByRole('button');
    expect(inputs[0]).toHaveTextContent('mm/dd/yyyy');
    expect(inputs[0]).toHaveTextContent('mm/dd/yyyy');
    expect(button).toHaveAttribute('aria-label', 'Calendar');

    expect(group.closest('.react-aria-DateRangePicker')).toBeInTheDocument();

    expect(group).toHaveAttribute('aria-labelledby');
    let label = document.getElementById(group.getAttribute('aria-labelledby'));
    expect(label).toHaveAttribute('class', 'react-aria-Label');
    expect(label).toHaveTextContent('Trip dates');

    expect(group).toHaveAttribute('aria-describedby');
    expect(group.getAttribute('aria-describedby').split(' ').map(id => document.getElementById(id).textContent).join(' ')).toBe('Description Error');

    for (let segment of getAllByRole('spinbutton')) {
      expect(segment).toHaveAttribute('class', 'react-aria-DateSegment');
      expect(segment).toHaveAttribute('data-placeholder', 'true');
      expect(segment).toHaveAttribute('data-type');
    }

    userEvent.click(button);

    let dialog = getByRole('dialog');
    expect(dialog).toHaveAttribute('class', 'react-aria-Dialog');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog.getAttribute('aria-labelledby')).toContain(label.id);
    expect(dialog.closest('.react-aria-Popover')).toBeInTheDocument();

    expect(getByRole('grid')).toHaveClass('react-aria-CalendarGrid');
  });
});