-- Seeds 8 Bengaluru hospitals into hospital_mock. Idempotent — safe to re-run.
-- Patient/vitals/medication seeding is in scripts/seed.ts.

DELETE FROM public.hospital_mock;

INSERT INTO public.hospital_mock (name, specialty, address, lat, lng, beds_available, beds_total, rating, phone) VALUES
  ('Apollo Hospital Whitefield',     ARRAY['cardiology','emergency','general'],   'Whitefield, Bengaluru',          12.9698, 77.7500, 4,  120, 4.6, '+91-80-12345001'),
  ('Manipal Hospital Whitefield',    ARRAY['cardiology','endocrinology','emergency'], 'Whitefield, Bengaluru',     12.9784, 77.7395, 7,  150, 4.5, '+91-80-12345002'),
  ('Columbia Asia Whitefield',       ARRAY['general','emergency'],                'Whitefield, Bengaluru',          12.9991, 77.7470, 2,   80, 4.3, '+91-80-12345003'),
  ('Fortis Cunningham Road',         ARRAY['cardiology','neurology','emergency'], 'Cunningham Road, Bengaluru',     12.9876, 77.5933, 5,  200, 4.4, '+91-80-12345004'),
  ('Narayana Health City',           ARRAY['cardiology','nephrology','emergency'], 'Bommasandra, Bengaluru',        12.8024, 77.6864, 12, 250, 4.7, '+91-80-12345005'),
  ('Sakra World Hospital',           ARRAY['endocrinology','general','emergency'], 'Marathahalli, Bengaluru',       12.9489, 77.7097, 3,  100, 4.4, '+91-80-12345006'),
  ('Sparsh Hospital Yeshwanthpur',   ARRAY['orthopedics','emergency','general'],  'Yeshwanthpur, Bengaluru',        13.0287, 77.5410, 6,   90, 4.2, '+91-80-12345007'),
  ('BGS Gleneagles Global',          ARRAY['cardiology','nephrology','emergency'], 'Kengeri, Bengaluru',            12.9082, 77.4842, 8,  180, 4.5, '+91-80-12345008');
