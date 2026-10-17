"use client";

import type { ReactNode } from "react";

type ConfirmDeleteFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  fieldName: string;
  fieldValue: string;
  confirmationMessage: string;
  buttonLabel?: string;
  children?: ReactNode;
};

export default function ConfirmDeleteForm({
  action,
  fieldName,
  fieldValue,
  confirmationMessage,
  buttonLabel = "Delete",
  children,
}: ConfirmDeleteFormProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmationMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name={fieldName} value={fieldValue} />
      {children}
      <button
        type="submit"
        className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
      >
        {buttonLabel}
      </button>
    </form>
  );
}
