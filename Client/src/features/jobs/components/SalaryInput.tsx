import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SalaryInputProps = {
  currency: string;
  salaryMin: number | null;
  salaryMax: number | null;
  onCurrencyChange: (value: string) => void;
  onSalaryMinChange: (value: string) => void;
  onSalaryMaxChange: (value: string) => void;
  disabled?: boolean;
};

export function SalaryInput({
  currency,
  salaryMin,
  salaryMax,
  onCurrencyChange,
  onSalaryMinChange,
  onSalaryMaxChange,
  disabled = false,
}: SalaryInputProps) {
  return (
    <div className="grid gap-4 md:grid-cols-[120px_1fr_1fr]">
      <div className="space-y-2">
        <Label>Currency</Label>
        <Input value={currency} onChange={(event) => onCurrencyChange(event.target.value)} maxLength={5} disabled={disabled} />
      </div>
      <div className="space-y-2">
        <Label>Salary Min</Label>
        <Input
          type="number"
          min={0}
          value={salaryMin ?? ""}
          onChange={(event) => onSalaryMinChange(event.target.value)}
          placeholder="65000"
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <Label>Salary Max</Label>
        <Input
          type="number"
          min={0}
          value={salaryMax ?? ""}
          onChange={(event) => onSalaryMaxChange(event.target.value)}
          placeholder="90000"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
