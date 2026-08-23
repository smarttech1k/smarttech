import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { reportUser, type ReportReason } from '../../../lib/profiles';

const REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'unsafe', label: 'Unsafe content or behaviour' },
  { value: 'other', label: 'Other' },
];

const DETAILS_MAX = 1000;

interface ReportUserDialogProps {
  open: boolean;
  targetId: string;
  targetName: string;
  onClose: () => void;
  onSubmitted: () => void;
  onError: (message: string) => void;
}

export const ReportUserDialog: React.FC<ReportUserDialogProps> = ({
  open,
  targetId,
  targetName,
  onClose,
  onSubmitted,
  onError,
}) => {
  const [reason, setReason] = useState<ReportReason>('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      await reportUser(targetId, reason, details);
      setDetails('');
      setReason('spam');
      onSubmitted();
    } catch (error: unknown) {
      onError(error instanceof Error ? error.message : 'Unable to submit this report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Report member"
      subtitle="Reports are sent privately to Korusa safety."
      size="sm"
      footer={
        <Button
          className="w-full"
          variant="danger"
          onClick={() => void handleSubmit()}
          disabled={submitting}
        >
          {submitting ? 'Submitting…' : 'Submit report'}
        </Button>
      }
    >
      <div className="space-y-4 p-5">
        <p className="text-sm text-sun-text-muted">
          Tell us what is wrong with <span className="font-semibold text-sun-text-main">{targetName}</span>
          . They are not told that you reported them.
        </p>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-sun-text-main">Reason</legend>
          {/* Radios rather than a <select>: five short options are quicker to read and to
              hit with a thumb than a native picker that covers half the screen. */}
          <div className="space-y-1.5">
            {REASONS.map((option) => (
              <label
                key={option.value}
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3.5 text-sm transition-colors ${
                  reason === option.value
                    ? 'border-sun-primary bg-sun-primary/8 font-semibold text-sun-primary'
                    : 'border-sun-border bg-sun-surface-light text-sun-text-main hover:border-sun-primary/30'
                }`}
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={option.value}
                  checked={reason === option.value}
                  onChange={() => setReason(option.value)}
                  className="accent-sun-primary"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="report-details" className="text-xs font-semibold">
              Details (optional)
            </label>
            <span className="text-[10px] text-sun-text-muted">
              {details.length}/{DETAILS_MAX}
            </span>
          </div>
          <textarea
            id="report-details"
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            maxLength={DETAILS_MAX}
            rows={4}
            placeholder="Tell us what happened…"
            className="w-full resize-none rounded-xl border border-sun-border bg-sun-surface-light p-3 text-sm outline-none transition-colors focus:border-sun-primary focus:ring-4 focus:ring-sun-primary/10"
          />
        </div>
      </div>
    </Modal>
  );
};
