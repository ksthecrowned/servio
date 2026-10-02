-- Congo-first payment methods.
-- Keep legacy UPI enum value for existing databases; application code no longer exposes it.
alter type payment_method add value if not exists 'mobile_money';
