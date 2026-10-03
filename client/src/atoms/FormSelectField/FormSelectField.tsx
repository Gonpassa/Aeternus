import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Select, type SelectOption } from '../Select/Select.tsx';
import { Stack } from '../Stack/Stack.tsx';
import { Text } from '../Text/Text.tsx';

// The `Select` sibling of `atoms/FormField`, added the day a form first needed one rather
// than speculatively, as ADR 0004 asked. `label` is a string here, not the `ReactNode`
// `FormField` takes: a closed `Select` is named by its own accessible label (ADR 0009), and
// this one string is both that name and the visible label above the trigger.
export interface FormSelectFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  items: readonly SelectOption[];
  /** Shown in the trigger while the field has no value. */
  placeholder?: string;
}

export function FormSelectField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ control, name, label, items, placeholder }: FormSelectFieldProps<TFieldValues, TName>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Stack direction="column" gap="1">
          <Select
            aria-label={label}
            showLabel
            items={items}
            value={field.value ?? ''}
            onChange={field.onChange}
            placeholder={placeholder}
            invalid={fieldState.invalid}
            aria-describedby={fieldState.error ? `${name}-error` : undefined}
          />
          {fieldState.error && (
            <Text id={`${name}-error`} variant="formError" role="alert">
              {fieldState.error.message}
            </Text>
          )}
        </Stack>
      )}
    />
  );
}
