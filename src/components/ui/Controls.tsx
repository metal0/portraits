import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export function Section(props: {
  icon: IconName;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}) {
  const [open, setOpen] = useState(!props.defaultCollapsed);
  const showBody = !props.collapsible || open;

  return (
    <section className={`section${props.collapsible ? " section--collapsible" : ""}`}>
      <div className="section__head">
        {props.collapsible ? (
          <button
            type="button"
            className="section__toggle"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name={props.icon} size={13} />
            <span>{props.title}</span>
            <Icon
              name="chevron"
              size={14}
              className={`section__chevron${open ? " is-open" : ""}`}
            />
          </button>
        ) : (
          <h2 className="section__title">
            <Icon name={props.icon} size={13} />
            {props.title}
          </h2>
        )}
        {props.actions && <div className="section__actions">{props.actions}</div>}
      </div>
      {showBody && props.children}
    </section>
  );
}

export function SliderField(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const { label, value, min, max, step = 1, suffix = "", onChange } = props;
  return (
    <label className="field">
      <span className="field__label">
        {label} <strong>{value}{suffix}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  title?: string;
}

export function Segmented<T extends string>(props: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented" role="tablist">
      {props.options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          title={opt.title}
          aria-selected={props.value === opt.value}
          className={`segmented__btn${props.value === opt.value ? " is-active" : ""}`}
          onClick={() => props.onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      <span className="toggle__track" aria-hidden />
      <span className="field__label">{props.label}</span>
    </label>
  );
}

export function ColorField(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="color-field">
      <input type="color" value={props.value} onChange={(e) => props.onChange(e.target.value)} />
      <span className="field__label">{props.label}</span>
    </label>
  );
}
