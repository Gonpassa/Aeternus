/* eslint-disable react/jsx-props-no-spreading --
   Forwards remaining Input props and RHF's field props (value/onChange/onBlur/ref/name)
   through to the underlying Input, which is the point of a thin Controller wrapper. */
import type { ReactNode } from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { FieldLabel } from '../FieldLabel/FieldLabel.tsx';
import { Input, type InputProps } from '../Input/Input.tsx';
import { Text } from '../Text/Text.tsx';

export interface FormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends Omit<InputProps, 'name' | 'defaultValue' | 'value' | 'onChange' | 'onBlur'> {
  control: Control<TFieldValues>;
  name: TName;
  label: ReactNode;
}

export function FormField<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>({
  control,
  name,
  label,
  ...inputProps
}: FormFieldProps<TFieldValues, TName>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <>
          <FieldLabel htmlFor={name}>
            {label}
            <Input
              {...inputProps}
              {...field}
              value={field.value ?? ''}
              id={name}
              aria-invalid={fieldState.invalid || undefined}
              aria-describedby={fieldState.error ? `${name}-error` : undefined}
            />
          </FieldLabel>
          {fieldState.error && (
            <Text id={`${name}-error`} variant="formError" role="alert">
              {fieldState.error.message}
            </Text>
          )}
        </>
      )}
    />
  );
}
