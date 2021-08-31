/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {AnyCalendarDate, AnyTime, CycleOptions, CycleTimeOptions, DateField, DateFields, Disambiguation, Duration, TimeField, TimeFields} from './types';
import {CalendarDate, CalendarDateTime, Time, ZonedDateTime} from './CalendarDate';
import {epochFromDate, fromAbsolute, toAbsolute, toCalendar, toCalendarDateTime} from './conversion';
import {getMinimumDayInMonth, getMinimumMonthInYear} from './queries';
import {GregorianCalendar} from './calendars/GregorianCalendar';
import {Mutable} from './utils';

const ONE_HOUR = 3600000;

/* eslint-disable no-redeclare */
export function add(date: CalendarDateTime, duration: Duration): CalendarDateTime;
export function add(date: CalendarDate, duration: Duration): CalendarDate;
export function add(date: CalendarDate | CalendarDateTime, duration: Duration): CalendarDate | CalendarDateTime;
export function add(date: CalendarDate | CalendarDateTime, duration: Duration) {
/* eslint-enable no-redeclare */
  let mutableDate: Mutable<AnyCalendarDate> = date.copy();
  let days = 'hour' in date ? addTimeFields(date, duration) : 0;

  if (date.calendar.add) {
    let res = date.calendar.add(date, duration);
    mutableDate.era = res.era;
    mutableDate.year = res.year;
    mutableDate.month = res.month;
    mutableDate.day = res.day;
  } else {
    addYears(mutableDate, duration.years || 0);
    mutableDate.month += duration.months || 0;

    balanceYearMonth(mutableDate);
    constrainMonthDay(mutableDate);

    mutableDate.day += (duration.weeks || 0) * 7;
    mutableDate.day += duration.days || 0;
    mutableDate.day += days;

    balanceDay(mutableDate);

    if (mutableDate.calendar.balanceDate) {
      mutableDate.calendar.balanceDate(mutableDate);
    }
  }

  return mutableDate;
}

function addYears(date: Mutable<AnyCalendarDate>, years: number) {
  if (date.calendar.addYears) {
    date.calendar.addYears(date, years);
  } else {
    date.year += years;
  }
}

function balanceYearMonth(date: Mutable<AnyCalendarDate>) {
  while (date.month < 1) {
    date.month += date.calendar.getMonthsInYear(date);
    addYears(date, -1);
  }

  let monthsInYear = 0;
  while (date.month > (monthsInYear = date.calendar.getMonthsInYear(date))) {
    date.month -= monthsInYear;
    addYears(date, 1);
  }
}

function balanceDay(date: Mutable<AnyCalendarDate>) {
  while (date.day < 1) {
    date.month--;
    balanceYearMonth(date);
    date.day += date.calendar.getDaysInMonth(date);
  }

  while (date.day > date.calendar.getDaysInMonth(date)) {
    date.day -= date.calendar.getDaysInMonth(date);
    date.month++;
    balanceYearMonth(date);
  }
}

function constrainMonthDay(date: Mutable<AnyCalendarDate>) {
  date.month = Math.max(getMinimumMonthInYear(date), Math.min(date.calendar.getMonthsInYear(date), date.month));
  date.day = Math.max(getMinimumDayInMonth(date), Math.min(date.calendar.getDaysInMonth(date), date.day));
}

function constrain(date: Mutable<AnyCalendarDate>) {
  if (date.calendar.constrainDate) {
    date.calendar.constrainDate(date);
  }

  date.year = Math.max(1, Math.min(date.calendar.getYearsInEra(date), date.year));
  constrainMonthDay(date);
}

export function invertDuration(duration: Duration): Duration {
  let inverseDuration = {};
  for (let key in duration) {
    if (typeof duration[key] === 'number') {
      inverseDuration[key] = -duration[key];
    }
  }

  return inverseDuration;
}

/* eslint-disable no-redeclare */
export function subtract(date: CalendarDateTime, duration: Duration): CalendarDateTime;
export function subtract(date: CalendarDate, duration: Duration): CalendarDate;
export function subtract(date: CalendarDate | CalendarDateTime, duration: Duration): CalendarDate | CalendarDateTime {
/* eslint-enable no-redeclare */
  return add(date, invertDuration(duration));
}

/* eslint-disable no-redeclare */
export function set(date: CalendarDateTime, fields: DateFields): CalendarDateTime;
export function set(date: CalendarDate, fields: DateFields): CalendarDate;
export function set(date: CalendarDate | CalendarDateTime, fields: DateFields) {
/* eslint-enable no-redeclare */
  let mutableDate: Mutable<AnyCalendarDate> = date.copy();

  if (fields.era != null) {
    mutableDate.era = fields.era;
  }

  if (fields.year != null) {
    mutableDate.year = fields.year;
  }

  if (fields.month != null) {
    mutableDate.month = fields.month;
  }

  if (fields.day != null) {
    mutableDate.day = fields.day;
  }

  constrain(mutableDate);
  return mutableDate;
}

/* eslint-disable no-redeclare */
export function setTime(value: CalendarDateTime, fields: TimeFields): CalendarDateTime;
export function setTime(value: Time, fields: TimeFields): Time;
export function setTime(value: Time | CalendarDateTime, fields: TimeFields) {
/* eslint-enable no-redeclare */
  let mutableValue: Mutable<Time | CalendarDateTime> = value.copy();

  if (fields.hour != null) {
    mutableValue.hour = fields.hour;
  }

  if (fields.minute != null) {
    mutableValue.minute = fields.minute;
  }

  if (fields.second != null) {
    mutableValue.second = fields.second;
  }

  if (fields.millisecond != null) {
    mutableValue.millisecond = fields.millisecond;
  }

  constrainTime(mutableValue);
  return mutableValue;
}

function balanceTime(time: Mutable<AnyTime>): number {
  time.second += Math.floor(time.millisecond / 1000);
  time.millisecond = nonNegativeMod(time.millisecond, 1000);

  time.minute += Math.floor(time.second / 60);
  time.second = nonNegativeMod(time.second, 60);

  time.hour += Math.floor(time.minute / 60);
  time.minute = nonNegativeMod(time.minute, 60);

  let days = Math.floor(time.hour / 24);
  time.hour = nonNegativeMod(time.hour, 24);

  return days;
}

function constrainTime(time: Mutable<AnyTime>) {
  time.millisecond = Math.max(0, Math.min(time.millisecond, 1000));
  time.second = Math.max(0, Math.min(time.second, 59));
  time.minute = Math.max(0, Math.min(time.minute, 59));
  time.hour = Math.max(0, Math.min(time.hour, 23));
}

function nonNegativeMod(a: number, b: number) {
  let result = a % b;
  if (result < 0) {
    result += b;
  }
  return result;
}

function addTimeFields(time: Mutable<AnyTime>, duration: Duration): number {
  time.hour += duration.hours || 0;
  time.minute += duration.minutes || 0;
  time.second += duration.seconds || 0;
  time.millisecond += duration.milliseconds || 0;
  return balanceTime(time);
}

export function addTime(time: Time, duration: Duration): Time {
  let res = time.copy();
  addTimeFields(res, duration);
  return res;
}

export function subtractTime(time: Time, duration: Duration): Time {
  return addTime(time, invertDuration(duration));
}

/* eslint-disable no-redeclare */
export function cycleDate(value: CalendarDateTime, field: DateField, amount: number, options?: CycleOptions): CalendarDateTime;
export function cycleDate(value: CalendarDate, field: DateField, amount: number, options?: CycleOptions): CalendarDate;
export function cycleDate(value: CalendarDate | CalendarDateTime, field: DateField, amount: number, options?: CycleOptions) {
/* eslint-enable no-redeclare */
  let mutable: Mutable<CalendarDate | CalendarDateTime> = value.copy();

  switch (field) {
    case 'era': {
      let eras = value.calendar.getEras();
      let eraIndex = eras.indexOf(value.era);
      if (eraIndex < 0) {
        throw new Error('Invalid era: ' + value.era);
      }
      eraIndex = cycleValue(eraIndex, amount, 0, eras.length - 1, options?.round);
      mutable.era = eras[eraIndex];
      break;
    }
    case 'year': {
      mutable.year = cycleValue(value.year, amount, 1, value.calendar.getYearsInEra(value), options?.round);
      break;
    }
    case 'month':
      mutable.month = cycleValue(value.month, amount, getMinimumMonthInYear(value), value.calendar.getMonthsInYear(value), options?.round);
      break;
    case 'day':
      mutable.day = cycleValue(value.day, amount, getMinimumDayInMonth(value), value.calendar.getDaysInMonth(value), options?.round);
      break;
    default:
      throw new Error('Unsupported field ' + field);
  }

  constrain(mutable);
  return mutable;
}

/* eslint-disable no-redeclare */
export function cycleTime(value: CalendarDateTime, field: TimeField, amount: number, options?: CycleTimeOptions): CalendarDateTime;
export function cycleTime(value: Time, field: TimeField, amount: number, options?: CycleTimeOptions): Time;
export function cycleTime(value: Time | CalendarDateTime, field: TimeField, amount: number, options?: CycleTimeOptions) {
/* eslint-enable no-redeclare */
  let mutable: Mutable<Time | CalendarDateTime> = value.copy();

  switch (field) {
    case 'hour': {
      let hours = value.hour;
      let min = 0;
      let max = 23;
      if (options?.hourCycle === 12) {
        let isPM = hours >= 12;
        min = isPM ? 12 : 0;
        max = isPM ? 23 : 11;
      }
      mutable.hour = cycleValue(hours, amount, min, max, options?.round);
      break;
    }
    case 'minute':
      mutable.minute = cycleValue(value.minute, amount, 0, 59, options?.round);
      break;
    case 'second':
      mutable.second = cycleValue(value.second, amount, 0, 59, options?.round);
      break;
    case 'millisecond':
      mutable.millisecond = cycleValue(value.millisecond, amount, 0, 999, options?.round);
      break;
    default:
      throw new Error('Unsupported field ' + field);
  }

  return mutable;
}

function cycleValue(value: number, amount: number, min: number, max: number, round = false) {
  if (round) {
    value += Math.sign(amount);

    if (value < min) {
      value = max;
    }

    let div = Math.abs(amount);
    if (amount > 0) {
      value = Math.ceil(value / div) * div;
    } else {
      value = Math.floor(value / div) * div;
    }

    if (value > max) {
      value = min;
    }
  } else {
    value += amount;
    if (value < min) {
      value = max - (min - value - 1);
    } else if (value > max) {
      value = min + (value - max - 1);
    }
  }

  return value;
}

export function addZoned(dateTime: ZonedDateTime, duration: Duration): ZonedDateTime {
  let ms: number;
  if ((duration.years != null && duration.years !== 0) || (duration.months != null && duration.months !== 0) || (duration.days != null && duration.days !== 0)) {
    let res = add(toCalendarDateTime(dateTime), {
      years: duration.years,
      months: duration.months,
      days: duration.days
    });

    // Changing the date may change the timezone offset, so we need to recompute
    // using the 'compatible' disambiguation.
    ms = toAbsolute(res, dateTime.timeZone);
  } else {
    // Otherwise, preserve the offset of the original date.
    ms = epochFromDate(dateTime) - dateTime.offset;
  }

  // Perform time manipulation in milliseconds rather than on the original time fields to account for DST.
  // For example, adding one hour during a DST transition may result in the hour field staying the same or
  // skipping an hour. This results in the offset field changing value instead of the specified field.
  ms += duration.milliseconds || 0;
  ms += (duration.seconds || 0) * 1000;
  ms += (duration.minutes || 0) * 60 * 1000;
  ms += (duration.hours || 0) * 60 * 60 * 1000;

  let res = fromAbsolute(ms, dateTime.timeZone);
  return toCalendar(res, dateTime.calendar);
}

export function subtractZoned(dateTime: ZonedDateTime, duration: Duration): ZonedDateTime {
  return addZoned(dateTime, invertDuration(duration));
}

export function cycleZoned(dateTime: ZonedDateTime, field: DateField | TimeField, amount: number, options?: CycleTimeOptions): ZonedDateTime {
  // For date fields, we want the time to remain consistent and the UTC offset to potentially change to account for DST changes.
  // For time fields, we want the time to change by the amount given. This may result in the hour field staying the same, but the UTC
  // offset changing in the case of a backward DST transition, or skipping an hour in the case of a forward DST transition.
  switch (field) {
    case 'hour': {
      let min = 0;
      let max = 23;
      if (options?.hourCycle === 12) {
        let isPM = dateTime.hour >= 12;
        min = isPM ? 12 : 0;
        max = isPM ? 23 : 11;
      }

      // The minimum and maximum hour may be affected by daylight saving time.
      // For example, it might jump forward at midnight, and skip 1am.
      // Or it might end at midnight and repeat the 11pm hour. To handle this, we get
      // the possible absolute times for the min and max, and find the maximum range
      // that is within the current day.
      let plainDateTime = toCalendarDateTime(dateTime);
      let minDate = toCalendar(setTime(plainDateTime, {hour: min}), new GregorianCalendar());
      let minAbsolute = [toAbsolute(minDate, dateTime.timeZone, 'earlier'), toAbsolute(minDate, dateTime.timeZone, 'later')]
        .filter(ms => fromAbsolute(ms, dateTime.timeZone).day === minDate.day)[0];

      let maxDate = toCalendar(setTime(plainDateTime, {hour: max}), new GregorianCalendar());
      let maxAbsolute = [toAbsolute(maxDate, dateTime.timeZone, 'earlier'), toAbsolute(maxDate, dateTime.timeZone, 'later')]
        .filter(ms => fromAbsolute(ms, dateTime.timeZone).day === maxDate.day).pop();

      // Since hours may repeat, we need to operate on the absolute time in milliseconds.
      // This is done in hours from the Unix epoch so that cycleValue works correctly,
      // and then converted back to milliseconds.
      let ms = epochFromDate(dateTime) - dateTime.offset;
      let hours = Math.floor(ms / ONE_HOUR);
      let remainder = ms % ONE_HOUR;
      ms = cycleValue(
        hours,
        amount,
        Math.floor(minAbsolute / ONE_HOUR),
        Math.floor(maxAbsolute / ONE_HOUR),
        options?.round
      ) * ONE_HOUR + remainder;

      // Now compute the new timezone offset, and convert the absolute time back to local time.
      return toCalendar(fromAbsolute(ms, dateTime.timeZone), dateTime.calendar);
    }
    case 'minute':
    case 'second':
    case 'millisecond':
      // @ts-ignore
      return cycleTime(dateTime, field, amount, options);
    case 'era':
    case 'year':
    case 'month':
    case 'day': {
      let res = cycleDate(toCalendarDateTime(dateTime), field, amount, options);
      let ms = toAbsolute(res, dateTime.timeZone);
      return toCalendar(fromAbsolute(ms, dateTime.timeZone), dateTime.calendar);
    }
    default:
      throw new Error('Unsupported field ' + field);
  }
}

export function setZoned(dateTime: ZonedDateTime, fields: DateFields & TimeFields, disambiguation?: Disambiguation): ZonedDateTime {
  // Set the date/time fields, and recompute the UTC offset to account for DST changes.
  // We also need to validate by converting back to a local time in case hours are skipped during forward DST transitions.
  let plainDateTime = toCalendarDateTime(dateTime);
  let res = setTime(set(plainDateTime, fields), fields);

  // If the resulting plain date time values are equal, return the original time.
  // We don't want to change the offset when setting the time to the same value.
  if (res.compare(plainDateTime) === 0) {
    return dateTime;
  }

  let ms = toAbsolute(res, dateTime.timeZone, disambiguation);
  return toCalendar(fromAbsolute(ms, dateTime.timeZone), dateTime.calendar);
}