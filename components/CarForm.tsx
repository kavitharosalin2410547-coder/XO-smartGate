"use client";

import { useState } from "react";
import Link from "next/link";
import PlateScanner from "./PlateScanner";
import { DuplicatePlateError, type CarInput } from "@/lib/db";
import { cleanPlate, formatPlate } from "@/lib/plate";

interface Props {
  initial?: Partial<CarInput>;
  submitLabel: string;
  onSubmit: (data: CarInput) => Promise<void>;
  onCancel?: () => void;
}

const EMPTY: CarInput = { plate: "", ownerName: "", phone: "", make: "", model: "", color: "", notes: "" };

export default function CarForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<CarInput>({ ...EMPTY, ...initial, plate: initial?.plate ? formatPlate(initial.plate) : "" });
  const [error, setError] = useState("");
  const [dupId, setDupId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof CarInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDupId(null);
    const plate = cleanPlate(form.plate);
    if (plate.length < 4) {
      setError("Enter the number plate (or scan it).");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ ...form, plate, ownerName: form.ownerName.trim(), phone: form.phone.trim() });
    } catch (err) {
      if (err instanceof DuplicatePlateError) {
        setDupId(err.existingId);
        setError("This number plate is already saved.");
      } else {
        setError(err instanceof Error ? err.message : "Could not save.");
      }
      setSaving(false);
    }
  }

  return (
    <form className="card form-card" onSubmit={submit}>
      <PlateScanner onPick={(plate) => setForm((f) => ({ ...f, plate: formatPlate(plate) }))} />

      <div className="field">
        <label htmlFor="plate">Number plate</label>
        <input
          id="plate"
          className="input plate-input"
          value={form.plate}
          onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value.toUpperCase() }))}
          placeholder="TN 09 AB 1234"
          autoCapitalize="characters"
          autoComplete="off"
          required
        />
      </div>

      <div className="two">
        <div className="field">
          <label htmlFor="make">Make</label>
          <input id="make" className="input" value={form.make} onChange={set("make")} placeholder="Maruti" />
        </div>
        <div className="field">
          <label htmlFor="model">Model</label>
          <input id="model" className="input" value={form.model} onChange={set("model")} placeholder="Swift" />
        </div>
      </div>

      <div className="two">
        <div className="field">
          <label htmlFor="color">Colour</label>
          <input id="color" className="input" value={form.color} onChange={set("color")} placeholder="White" />
        </div>
        <div className="field">
          <label htmlFor="phone">Owner phone</label>
          <input id="phone" className="input" type="tel" value={form.phone} onChange={set("phone")} placeholder="98765 43210" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="owner">Owner name</label>
        <input id="owner" className="input" value={form.ownerName} onChange={set("ownerName")} />
      </div>

      <div className="field">
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" className="input" rows={2} value={form.notes} onChange={set("notes")} placeholder="Scratches, special requests…" />
      </div>

      {error && (
        <p className="error" role="alert">
          {error} {dupId && <Link href={`/customers/view/?id=${dupId}`}>Open that vehicle</Link>}
        </p>
      )}

      <div className="row">
        <button className="btn primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
