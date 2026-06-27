-- Update keys_given constraint to allow 'reception' status
ALTER TABLE public.room_guests DROP CONSTRAINT IF EXISTS room_guests_keys_given_check;
ALTER TABLE public.room_guests ADD CONSTRAINT room_guests_keys_given_check CHECK (keys_given IN ('not_given', 'given', 'collected', 'reception'));

-- Update ac_remote_given constraint to allow 'reception' status (if it exists)
ALTER TABLE public.room_guests DROP CONSTRAINT IF EXISTS room_guests_ac_remote_given_check;
ALTER TABLE public.room_guests ADD CONSTRAINT room_guests_ac_remote_given_check CHECK (ac_remote_given IN ('not_given', 'given', 'collected', 'reception'));
