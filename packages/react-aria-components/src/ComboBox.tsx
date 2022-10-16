import {AriaComboBoxProps} from '@react-types/combobox';
import {ButtonContext} from './Button';
import {ComboBoxState, useComboBoxState} from 'react-stately';
import {InputContext} from './Input';
import {LabelContext} from './Label';
import {ListBoxContext, ListBoxProps} from './ListBox';
import {PopoverContext} from './Popover';
import {Provider, RenderProps, slotCallbackSymbol, useRenderProps, useSlot} from './utils';
import React, {ForwardedRef, forwardRef, useCallback, useRef, useState} from 'react';
import {TextContext} from './Text';
import {useCollection} from './Collection';
import {useComboBox, useFilter} from 'react-aria';
import {useResizeObserver} from '@react-aria/utils';

interface ComboBoxProps<T extends object> extends Omit<AriaComboBoxProps<T>, 'children' | 'placeholder' | 'name' | 'label' | 'description' | 'errorMessage'>, RenderProps<ComboBoxState<T>> {
  /** The filter function used to determine if a option should be included in the combo box list. */
  defaultFilter?: (textValue: string, inputValue: string) => boolean
}

function ComboBox<T extends object>(props: ComboBoxProps<T>, ref: ForwardedRef<HTMLDivElement>) {
  let [propsFromListBox, setListBoxProps] = useState<ListBoxProps<T>>({children: []});

  let {contains} = useFilter({sensitivity: 'base'});
  let {portal, collection} = useCollection({
    items: props.items ?? props.defaultItems ?? propsFromListBox.items,
    children: propsFromListBox.children
  });
  let state = useComboBoxState({
    defaultFilter: props.defaultFilter || contains,
    ...props,
    items: propsFromListBox ? (props.items ?? propsFromListBox.items) : [],
    children: null,
    collection
  });

  let buttonRef = useRef<HTMLButtonElement>(null);
  let inputRef = useRef<HTMLInputElement>(null);
  let listBoxRef = useRef(null);
  let popoverRef = useRef(null);
  let [labelRef, label] = useSlot();
  let {
    buttonProps,
    inputProps,
    listBoxProps,
    labelProps,
    descriptionProps,
    errorMessageProps
  } = useComboBox({
    ...props,
    label,
    inputRef,
    buttonRef,
    listBoxRef,
    popoverRef
  },
  state);

  // Make menu width match input + button
  let [menuWidth, setMenuWidth] = useState(null);
  let onResize = useCallback(() => {
    if (inputRef.current) {
      let buttonRect = buttonRef.current?.getBoundingClientRect();
      let inputRect = inputRef.current.getBoundingClientRect();
      let minX = buttonRect ? Math.min(buttonRect.left, inputRect.left) : inputRect.left;
      let maxX = buttonRect ? Math.max(buttonRect.right, inputRect.right) : inputRect.right;
      setMenuWidth((maxX - minX) + 'px');
    }
  }, [buttonRef, inputRef, setMenuWidth]);

  useResizeObserver({
    ref: inputRef,
    onResize: onResize
  });

  let renderProps = useRenderProps({
    ...props,
    values: state,
    defaultClassName: 'react-aria-ComboBox'
  });

  return (
    <Provider
      values={[
        [LabelContext, {...labelProps, ref: labelRef}],
        [ButtonContext, {...buttonProps, ref: buttonRef}],
        [InputContext, {...inputProps, ref: inputRef}],
        [PopoverContext, {
          state,
          ref: popoverRef,
          triggerRef: inputRef,
          placement: 'bottom start',
          preserveChildren: true,
          isNonModal: true,
          style: {'--combobox-width': menuWidth} as React.CSSProperties
        }],
        [ListBoxContext, {state, [slotCallbackSymbol]: setListBoxProps, ...listBoxProps, ref: listBoxRef}],
        [TextContext, {
          slots: {
            description: descriptionProps,
            errorMessage: errorMessageProps
          }
        }]
      ]}>
      <div {...renderProps} ref={ref}>
        {props.children}
      </div>
      {portal}
    </Provider>
  );
}

/**
 * A combo box combines a text input with a listbox, allowing users to filter a list of options to items matching a query.
 */
const _ComboBox = forwardRef(ComboBox);
export {_ComboBox as ComboBox};