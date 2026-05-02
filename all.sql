--
-- PostgreSQL database dump
--

\restrict fVFlwWTxqR5A1HozqOg9hhq47He4GUqjDcUgFRmhqOLliMyPa0XqZIBOA1fesmc

-- Dumped from database version 14.20 (Homebrew)
-- Dumped by pg_dump version 14.20 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.zones DROP CONSTRAINT IF EXISTS zones_leader_id_fkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_zone_id_fkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_member_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_sender_zone_id_fkey;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_sender_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.events DROP CONSTRAINT IF EXISTS events_zone_id_fkey;
ALTER TABLE IF EXISTS ONLY public.event_instances DROP CONSTRAINT IF EXISTS event_instances_event_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attendance DROP CONSTRAINT IF EXISTS attendance_member_id_fkey;
ALTER TABLE IF EXISTS ONLY public.attendance DROP CONSTRAINT IF EXISTS attendance_instance_id_fkey;
DROP INDEX IF EXISTS public.idx_zones_leader_id;
DROP INDEX IF EXISTS public.idx_users_zone_id;
DROP INDEX IF EXISTS public.idx_users_role;
DROP INDEX IF EXISTS public.idx_users_member_id;
DROP INDEX IF EXISTS public.idx_messages_type;
DROP INDEX IF EXISTS public.idx_messages_sent_at;
DROP INDEX IF EXISTS public.idx_messages_sender_zone_id;
DROP INDEX IF EXISTS public.idx_messages_sender_user_id;
DROP INDEX IF EXISTS public.idx_members_zone;
DROP INDEX IF EXISTS public.idx_members_status;
DROP INDEX IF EXISTS public.idx_members_name;
DROP INDEX IF EXISTS public.idx_members_marriage_date;
DROP INDEX IF EXISTS public.idx_members_email;
DROP INDEX IF EXISTS public.idx_instances_status;
DROP INDEX IF EXISTS public.idx_instances_event;
DROP INDEX IF EXISTS public.idx_instances_date;
DROP INDEX IF EXISTS public.idx_events_zone_id;
DROP INDEX IF EXISTS public.idx_events_type;
DROP INDEX IF EXISTS public.idx_events_active;
DROP INDEX IF EXISTS public.idx_attendance_member;
DROP INDEX IF EXISTS public.idx_attendance_instance;
ALTER TABLE IF EXISTS ONLY public.zones DROP CONSTRAINT IF EXISTS zones_pkey;
ALTER TABLE IF EXISTS ONLY public.zones DROP CONSTRAINT IF EXISTS zones_name_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.settings DROP CONSTRAINT IF EXISTS settings_pkey;
ALTER TABLE IF EXISTS ONLY public.settings DROP CONSTRAINT IF EXISTS settings_key_key;
ALTER TABLE IF EXISTS ONLY public.migrations DROP CONSTRAINT IF EXISTS migrations_pkey;
ALTER TABLE IF EXISTS ONLY public.migrations DROP CONSTRAINT IF EXISTS migrations_name_key;
ALTER TABLE IF EXISTS ONLY public.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE IF EXISTS ONLY public.members DROP CONSTRAINT IF EXISTS members_pkey;
ALTER TABLE IF EXISTS ONLY public.members DROP CONSTRAINT IF EXISTS members_email_key;
ALTER TABLE IF EXISTS ONLY public.events DROP CONSTRAINT IF EXISTS events_pkey;
ALTER TABLE IF EXISTS ONLY public.event_instances DROP CONSTRAINT IF EXISTS event_instances_pkey;
ALTER TABLE IF EXISTS ONLY public.event_instances DROP CONSTRAINT IF EXISTS event_instances_event_id_date_key;
ALTER TABLE IF EXISTS ONLY public.attendance DROP CONSTRAINT IF EXISTS attendance_pkey;
ALTER TABLE IF EXISTS ONLY public.attendance DROP CONSTRAINT IF EXISTS attendance_instance_id_member_id_key;
ALTER TABLE IF EXISTS public.settings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.migrations ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS public.zones;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.settings_id_seq;
DROP TABLE IF EXISTS public.settings;
DROP SEQUENCE IF EXISTS public.migrations_id_seq;
DROP TABLE IF EXISTS public.migrations;
DROP TABLE IF EXISTS public.messages;
DROP TABLE IF EXISTS public.members;
DROP TABLE IF EXISTS public.events;
DROP TABLE IF EXISTS public.event_instances;
DROP TABLE IF EXISTS public.attendance;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instance_id uuid NOT NULL,
    member_id uuid,
    visitor_name character varying(200),
    checked_in_at timestamp with time zone DEFAULT now(),
    status character varying(20) DEFAULT 'Present'::character varying,
    CONSTRAINT attendance_status_check CHECK (((status)::text = ANY ((ARRAY['Present'::character varying, 'Excused'::character varying, 'Absent'::character varying])::text[])))
);


--
-- Name: event_instances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    date date NOT NULL,
    status character varying(20) DEFAULT 'scheduled'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    name_override character varying(200),
    type_override character varying(50),
    location_override character varying(255),
    CONSTRAINT event_instances_status_check CHECK (((status)::text = ANY ((ARRAY['scheduled'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    type character varying(50) DEFAULT 'Service'::character varying,
    location character varying(255),
    start_time time without time zone,
    is_recurring boolean DEFAULT false,
    recurrence_rule character varying(20),
    day_of_week smallint,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    zone_id uuid,
    CONSTRAINT events_day_of_week_check CHECK ((((day_of_week >= 0) AND (day_of_week <= 6)) OR (day_of_week IS NULL))),
    CONSTRAINT events_recurrence_rule_check CHECK ((((recurrence_rule)::text = ANY ((ARRAY['weekly'::character varying, 'biweekly'::character varying, 'monthly'::character varying, 'yearly'::character varying])::text[])) OR (recurrence_rule IS NULL))),
    CONSTRAINT events_type_check CHECK (((type)::text = ANY ((ARRAY['Service'::character varying, 'Meeting'::character varying, 'Special'::character varying, 'Workshop'::character varying, 'Prayer'::character varying, 'Youth'::character varying])::text[])))
);


--
-- Name: members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(255),
    phone character varying(20),
    address text,
    status character varying(20) DEFAULT 'Active'::character varying,
    zone_id uuid,
    join_date date DEFAULT CURRENT_DATE,
    avatar_url text,
    notes text,
    dob date,
    gender character varying(10),
    role character varying(50),
    occupation character varying(100),
    emergency_contact character varying(100),
    emergency_phone character varying(20),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    discovery_source character varying(50),
    marital_status character varying(20),
    marriage_date date,
    mother_name character varying(100),
    mother_status character varying(20),
    father_name character varying(100),
    father_status character varying(20),
    spouse_name character varying(100),
    spouse_phone character varying(20),
    is_baptized boolean DEFAULT false,
    baptism_date date,
    baptized_by character varying(100),
    baptism_method character varying(50),
    baptism_church character varying(150),
    children jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT members_gender_check CHECK ((((gender)::text = ANY ((ARRAY['Male'::character varying, 'Female'::character varying, 'Other'::character varying])::text[])) OR (gender IS NULL))),
    CONSTRAINT members_status_check CHECK (((status)::text = ANY ((ARRAY['Active'::character varying, 'Inactive'::character varying, 'Visitor'::character varying])::text[])))
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content text NOT NULL,
    channel character varying(10) DEFAULT 'sms'::character varying NOT NULL,
    recipient_type character varying(20) NOT NULL,
    recipient_target character varying(255),
    recipient_label character varying(255),
    recipient_count integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'sent'::character varying NOT NULL,
    type character varying(20) DEFAULT 'manual'::character varying NOT NULL,
    sent_at timestamp with time zone DEFAULT now(),
    sender_user_id uuid,
    sender_role character varying(20),
    sender_zone_id uuid
);


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    applied_at timestamp with time zone DEFAULT now()
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id integer NOT NULL,
    key character varying(100) NOT NULL,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(120),
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    role character varying(20) NOT NULL,
    member_id uuid,
    zone_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'zone_leader'::character varying])::text[])))
);


--
-- Name: zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    leader character varying(100),
    description text,
    meeting_time character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    leader_id uuid
);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


--
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attendance (id, instance_id, member_id, visitor_name, checked_in_at, status) FROM stdin;
095e1448-a284-4a84-96c2-323da9584cbe	10f8a384-fa91-42ef-8794-bcb60f3fac8d	720a53b2-f3cd-4b5c-a54f-38fb67843046	\N	2026-02-15 13:48:42.773734+00	Present
b36fcc6c-1437-418f-9f7e-bc53c000965c	10f8a384-fa91-42ef-8794-bcb60f3fac8d	\N	https://randomqr.com	2026-02-15 14:18:04.038224+00	Present
d17c1704-0379-4710-b8d1-3770e65f2fc6	10f8a384-fa91-42ef-8794-bcb60f3fac8d	b912439b-d038-4fcc-abb0-7bde08bb5bbb	\N	2026-02-15 15:55:46.988814+00	Present
6d7ad3bd-43a2-40db-8dbb-34b3573c7d9d	10f8a384-fa91-42ef-8794-bcb60f3fac8d	e69d3e35-89cb-4395-b991-53e7a22a2c2a	\N	2026-02-15 16:20:32.94267+00	Present
70f4586b-7ef9-4121-b0f7-c541178eefcd	10f8a384-fa91-42ef-8794-bcb60f3fac8d	535078bb-6ef1-4235-b32d-133943d4cb81	\N	2026-02-15 17:46:22.711503+00	Present
64c00765-ed6d-4e68-b730-3532cb9f57ba	cc5c56a8-a2ea-4fb7-b370-30592c8b3d2b	b912439b-d038-4fcc-abb0-7bde08bb5bbb	\N	2026-02-16 19:49:36.879837+00	Present
939c5031-9917-4269-b6aa-28f41cd0bd7e	cc5c56a8-a2ea-4fb7-b370-30592c8b3d2b	535078bb-6ef1-4235-b32d-133943d4cb81	\N	2026-02-18 07:48:33.094608+00	Present
0f09bf63-e015-490a-94b6-6e5dcb1c569a	04aca4c6-76f8-472f-861f-2d43581abb08	5681c0d6-4234-4df1-ba40-59342e8dbd8c	\N	2026-04-26 10:14:16.453232+00	Present
dfeb91d3-840c-44db-b76f-04eefe1ba916	04aca4c6-76f8-472f-861f-2d43581abb08	fe3e9f12-9434-4161-8489-40ef8229e69b	\N	2026-04-26 10:15:38.634575+00	Present
15cdc537-c951-4e2e-b583-1d73c8c9bbab	04aca4c6-76f8-472f-861f-2d43581abb08	0e64e6a9-3738-48cc-af92-77dd272c0165	\N	2026-04-26 11:06:26.797768+00	Present
941533ca-e37f-4323-b79f-c0712d69dc04	04aca4c6-76f8-472f-861f-2d43581abb08	ee9f2f48-0b93-4f61-8bda-98db600d889c	\N	2026-04-26 11:10:54.384502+00	Present
1c46fea8-1a17-4c29-94e3-7b391d08aa38	70ec0bbc-ee73-4977-a8d4-11657be3c2ea	0e64e6a9-3738-48cc-af92-77dd272c0165	\N	2026-05-02 15:13:41.993436+00	Present
fc87c595-1652-4594-83c6-021a1ec385a4	70ec0bbc-ee73-4977-a8d4-11657be3c2ea	855ee4bf-42d2-44c2-b224-b5560c17d1ba	\N	2026-05-02 15:13:46.433941+00	Present
7fdc18ad-9da1-4edb-af50-08fa3f166fe8	70ec0bbc-ee73-4977-a8d4-11657be3c2ea	33ae8d11-e4e8-48bd-b958-cb6dc080600b	\N	2026-05-02 15:17:31.570243+00	Present
\.


--
-- Data for Name: event_instances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.event_instances (id, event_id, date, status, notes, created_at, name_override, type_override, location_override) FROM stdin;
508e34d9-2358-484c-a567-d89ce18417df	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-05-05	scheduled	\N	2026-04-04 00:11:32.327936+00	\N	\N	\N
51fbd642-18ed-40c9-b1eb-e7472b986a79	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-05-12	scheduled	\N	2026-04-04 00:11:32.328998+00	\N	\N	\N
a526cfee-79f7-4738-9bec-338949462519	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-05-19	scheduled	\N	2026-04-04 00:11:32.330897+00	\N	\N	\N
70ec0bbc-ee73-4977-a8d4-11657be3c2ea	cc922447-2091-48d0-b38e-c0c79df9845e	2026-05-03	scheduled	\N	2026-04-04 00:11:59.449003+00	\N	\N	\N
379ce2bd-e10a-45a3-a9f0-98e740fea443	cc922447-2091-48d0-b38e-c0c79df9845e	2026-05-10	scheduled	\N	2026-04-04 00:11:59.450684+00	\N	\N	\N
ad49f182-82d3-415e-8ae5-c8fce2a8c942	cc922447-2091-48d0-b38e-c0c79df9845e	2026-05-17	scheduled	\N	2026-04-04 00:11:59.451697+00	\N	\N	\N
dd8eb277-40d9-4b4b-9b8b-8fd473615de9	cc922447-2091-48d0-b38e-c0c79df9845e	2026-05-24	scheduled	\N	2026-04-04 00:11:59.452736+00	\N	\N	\N
de5674d6-adfb-4868-854a-fd65e94624d1	cc922447-2091-48d0-b38e-c0c79df9845e	2026-05-31	scheduled	\N	2026-04-04 00:11:59.453858+00	\N	\N	\N
e4dbbba0-0c26-4747-8885-4829fb0a3462	cc922447-2091-48d0-b38e-c0c79df9845e	2026-06-07	scheduled	\N	2026-04-04 00:11:59.454914+00	\N	\N	\N
42e3ae9f-8e49-44b7-8b08-6f042dcf2570	cc922447-2091-48d0-b38e-c0c79df9845e	2026-06-14	scheduled	\N	2026-04-04 00:11:59.455848+00	\N	\N	\N
cb683898-294f-40b4-9443-518b2a8fcca9	cc922447-2091-48d0-b38e-c0c79df9845e	2026-06-21	scheduled	\N	2026-04-04 00:11:59.458484+00	\N	\N	\N
e817d23a-995e-4545-a88e-761d880be93e	cc922447-2091-48d0-b38e-c0c79df9845e	2026-06-28	scheduled	\N	2026-04-04 00:11:59.459369+00	\N	\N	\N
ecea7b04-02f6-4b31-b90e-6a7bdcc1c34b	cc922447-2091-48d0-b38e-c0c79df9845e	2026-07-05	scheduled	\N	2026-04-04 00:11:59.460887+00	\N	\N	\N
6f958692-3bee-4e45-9f93-b4f665731461	cc922447-2091-48d0-b38e-c0c79df9845e	2026-07-12	scheduled	\N	2026-04-04 00:11:59.461662+00	\N	\N	\N
e9d97a47-f750-42d7-b484-ddc1e2ef403e	cc922447-2091-48d0-b38e-c0c79df9845e	2026-07-19	scheduled	\N	2026-04-04 00:11:59.46264+00	\N	\N	\N
c2246aae-25e3-4918-90af-9f43be843acc	cc922447-2091-48d0-b38e-c0c79df9845e	2026-07-26	scheduled	\N	2026-04-04 00:11:59.463587+00	\N	\N	\N
b5d12dab-7153-4628-a5b5-ce22d0b2d400	cc922447-2091-48d0-b38e-c0c79df9845e	2026-08-02	scheduled	\N	2026-04-04 00:11:59.464599+00	\N	\N	\N
d0f58d6d-4cd8-430d-835c-c9f6e675615a	cc922447-2091-48d0-b38e-c0c79df9845e	2026-08-09	scheduled	\N	2026-04-04 00:11:59.465594+00	\N	\N	\N
b3f688fc-300a-4ede-86de-65bf174d9c2a	cc922447-2091-48d0-b38e-c0c79df9845e	2026-08-16	scheduled	\N	2026-04-04 00:11:59.466348+00	\N	\N	\N
ccd5036e-0b45-41c1-be98-2a36a54542fe	cc922447-2091-48d0-b38e-c0c79df9845e	2026-08-23	scheduled	\N	2026-04-04 00:11:59.467132+00	\N	\N	\N
47d80cf6-7aff-4839-8d20-7bf0ab8e2f34	cc922447-2091-48d0-b38e-c0c79df9845e	2026-08-30	scheduled	\N	2026-04-04 00:11:59.467929+00	\N	\N	\N
51fb695e-354e-409e-9519-284b3d5a6ee2	cc922447-2091-48d0-b38e-c0c79df9845e	2026-09-06	scheduled	\N	2026-04-04 00:11:59.468671+00	\N	\N	\N
0bc19e23-af7c-4395-838a-572445f330fa	cc922447-2091-48d0-b38e-c0c79df9845e	2026-09-13	scheduled	\N	2026-04-04 00:11:59.469494+00	\N	\N	\N
11d18d25-66b9-4834-962c-8eed82f784c1	cc922447-2091-48d0-b38e-c0c79df9845e	2026-09-20	scheduled	\N	2026-04-04 00:11:59.470522+00	\N	\N	\N
122d16a9-5a9b-4c80-9876-a7464bfbd35e	cc922447-2091-48d0-b38e-c0c79df9845e	2026-09-27	scheduled	\N	2026-04-04 00:11:59.47135+00	\N	\N	\N
8db389be-c5b7-4c12-9b38-1ad695eaf1c6	cc922447-2091-48d0-b38e-c0c79df9845e	2026-10-04	scheduled	\N	2026-04-04 00:11:59.472719+00	\N	\N	\N
57602fad-b3f1-4fc9-b73d-4329f8ccf1ee	cc922447-2091-48d0-b38e-c0c79df9845e	2026-10-11	scheduled	\N	2026-04-04 00:11:59.473565+00	\N	\N	\N
672131d0-7dc8-40b9-a0b3-90cbe6fa168f	cc922447-2091-48d0-b38e-c0c79df9845e	2026-10-18	scheduled	\N	2026-04-04 00:11:59.474332+00	\N	\N	\N
9b5fd2ee-2dc6-4efe-ab2d-377d32270889	cc922447-2091-48d0-b38e-c0c79df9845e	2026-10-25	scheduled	\N	2026-04-04 00:11:59.475132+00	\N	\N	\N
97f7bcbc-0b00-4b9b-a627-d8264e501d1d	cc922447-2091-48d0-b38e-c0c79df9845e	2026-11-01	scheduled	\N	2026-04-04 00:11:59.477324+00	\N	\N	\N
03333bb7-5989-4e69-9356-0576258c57ae	cc922447-2091-48d0-b38e-c0c79df9845e	2026-11-08	scheduled	\N	2026-04-04 00:11:59.478062+00	\N	\N	\N
9c3859cc-901f-4aba-83ac-7b24128ad97a	cc922447-2091-48d0-b38e-c0c79df9845e	2026-11-15	scheduled	\N	2026-04-04 00:11:59.478888+00	\N	\N	\N
256cdee8-5cfd-4565-9a7a-bb27d4dfa6c7	cc922447-2091-48d0-b38e-c0c79df9845e	2026-11-22	scheduled	\N	2026-04-04 00:11:59.479588+00	\N	\N	\N
9b1d30d1-0539-4982-aad8-fac196694e51	cc922447-2091-48d0-b38e-c0c79df9845e	2026-11-29	scheduled	\N	2026-04-04 00:11:59.480315+00	\N	\N	\N
96f60d9e-8f41-44b8-a7cf-648d8ceccefb	cc922447-2091-48d0-b38e-c0c79df9845e	2026-12-06	scheduled	\N	2026-04-04 00:11:59.481061+00	\N	\N	\N
8d9a80e9-7a95-477d-a4ec-b75dcba40a1d	cc922447-2091-48d0-b38e-c0c79df9845e	2026-12-13	scheduled	\N	2026-04-04 00:11:59.481791+00	\N	\N	\N
6c8e5fe9-b659-4f07-9c73-14b1f54583e1	cc922447-2091-48d0-b38e-c0c79df9845e	2026-12-20	scheduled	\N	2026-04-04 00:11:59.482656+00	\N	\N	\N
3a0c02f3-3312-4346-a456-5af6e8627a2f	cc922447-2091-48d0-b38e-c0c79df9845e	2026-12-27	scheduled	\N	2026-04-04 00:11:59.483479+00	\N	\N	\N
4a237f33-6e41-4e67-9af9-52f15ed1537c	cc922447-2091-48d0-b38e-c0c79df9845e	2027-01-03	scheduled	\N	2026-04-04 00:11:59.484203+00	\N	\N	\N
13bedecc-30c8-480c-932f-17f9b7969c1b	cc922447-2091-48d0-b38e-c0c79df9845e	2027-01-10	scheduled	\N	2026-04-04 00:11:59.484915+00	\N	\N	\N
708db463-492f-4e77-ab67-c76b82c468a4	cc922447-2091-48d0-b38e-c0c79df9845e	2027-01-17	scheduled	\N	2026-04-04 00:11:59.485554+00	\N	\N	\N
b635ec7d-52dd-4519-89a3-5a1517ae7caf	cc922447-2091-48d0-b38e-c0c79df9845e	2027-01-24	scheduled	\N	2026-04-04 00:11:59.486254+00	\N	\N	\N
0e848da6-0721-4788-bfa2-b6494a0178eb	cc922447-2091-48d0-b38e-c0c79df9845e	2027-01-31	scheduled	\N	2026-04-04 00:11:59.486989+00	\N	\N	\N
6bb2cc3b-5542-4d3e-868f-1e4b7aff5684	cc922447-2091-48d0-b38e-c0c79df9845e	2027-02-07	scheduled	\N	2026-04-04 00:11:59.487635+00	\N	\N	\N
29b714a1-7813-4092-942c-d1f40b6d7b18	cc922447-2091-48d0-b38e-c0c79df9845e	2027-02-14	scheduled	\N	2026-04-04 00:11:59.488346+00	\N	\N	\N
c7bba2c8-06e1-4075-8766-f552696dd59f	cc922447-2091-48d0-b38e-c0c79df9845e	2027-02-21	scheduled	\N	2026-04-04 00:11:59.488993+00	\N	\N	\N
959ea4d1-9147-4325-88c5-18270bf01cda	cc922447-2091-48d0-b38e-c0c79df9845e	2027-02-28	scheduled	\N	2026-04-04 00:11:59.489637+00	\N	\N	\N
0085abaf-b95b-4c16-b59b-04d481282669	cc922447-2091-48d0-b38e-c0c79df9845e	2027-03-07	scheduled	\N	2026-04-04 00:11:59.49034+00	\N	\N	\N
4893435f-e2c2-4211-b9e9-a3f4b356cb5d	cc922447-2091-48d0-b38e-c0c79df9845e	2027-03-14	scheduled	\N	2026-04-04 00:11:59.490969+00	\N	\N	\N
0d234138-b578-4aff-8573-f0c96dfd2177	cc922447-2091-48d0-b38e-c0c79df9845e	2027-03-21	scheduled	\N	2026-04-04 00:11:59.491571+00	\N	\N	\N
028ef6db-93f1-4dfa-be63-53180e74426e	cc922447-2091-48d0-b38e-c0c79df9845e	2026-03-29	completed		2026-02-15 13:48:21.954641+00	\N	\N	\N
10f8a384-fa91-42ef-8794-bcb60f3fac8d	cc922447-2091-48d0-b38e-c0c79df9845e	2026-02-15	completed	\N	2026-02-15 13:48:21.876231+00	\N	\N	\N
cc5c56a8-a2ea-4fb7-b370-30592c8b3d2b	cc922447-2091-48d0-b38e-c0c79df9845e	2026-02-22	completed	\N	2026-02-15 13:48:21.926773+00	\N	\N	\N
b9b40a02-187d-423a-8e46-b04afb518771	cc922447-2091-48d0-b38e-c0c79df9845e	2026-03-01	completed	\N	2026-02-15 13:48:21.938238+00	\N	\N	\N
bee9e645-edad-4f1d-a796-1a63527606b9	cc922447-2091-48d0-b38e-c0c79df9845e	2026-03-08	completed	\N	2026-02-15 13:48:21.940634+00	\N	\N	\N
06013072-98a2-4500-ae67-9cb4912cd290	cc922447-2091-48d0-b38e-c0c79df9845e	2026-03-15	completed	\N	2026-02-15 13:48:21.944215+00	\N	\N	\N
72dce651-a072-4927-ab9d-ea3907bd77fd	cc922447-2091-48d0-b38e-c0c79df9845e	2026-03-22	completed	\N	2026-02-15 13:48:21.948065+00	\N	\N	\N
6e8fe584-28f6-4609-a4cf-3a07cd4bb513	34c70508-1a35-45e7-b6ca-32486dc79fec	2026-05-03	scheduled	\N	2026-04-23 07:21:58.528951+00	\N	\N	\N
65dca033-97ea-4668-ab63-4f2ca212a24e	34c70508-1a35-45e7-b6ca-32486dc79fec	2026-05-10	scheduled	\N	2026-04-23 07:21:58.529843+00	\N	\N	\N
882df804-74dc-42a4-a152-885a8e9a056d	cc922447-2091-48d0-b38e-c0c79df9845e	2026-04-05	completed		2026-02-15 13:48:21.959551+00	step down	Service	\N
bf26105f-148a-4538-a9f0-33442b708916	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-04-07	completed	\N	2026-04-04 00:11:32.319053+00	\N	\N	\N
7153f5a3-63ce-42c8-9966-3b76d800f17f	cc922447-2091-48d0-b38e-c0c79df9845e	2026-04-12	completed	\N	2026-04-04 00:11:59.445286+00	\N	\N	\N
c584ce21-bf4b-4ecf-b3fb-313230ae9ade	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-04-14	completed		2026-04-04 00:11:32.323747+00	Step Down!	Special	\N
565b078b-c38e-478e-ae5b-41385a5908d1	34c70508-1a35-45e7-b6ca-32486dc79fec	2026-05-17	scheduled	\N	2026-04-23 07:21:58.531113+00	\N	\N	\N
c0d512b7-9c51-45ca-b5b7-374890eb2f7f	34c70508-1a35-45e7-b6ca-32486dc79fec	2026-05-24	scheduled	\N	2026-04-23 07:21:58.532242+00	\N	\N	\N
026b9366-cb84-45cf-8d02-6b0c7ed639bc	34c70508-1a35-45e7-b6ca-32486dc79fec	2026-05-31	scheduled	\N	2026-04-23 07:21:58.5341+00	\N	\N	\N
dd94d04c-e530-4547-9974-f60a71ff8658	34c70508-1a35-45e7-b6ca-32486dc79fec	2026-06-07	scheduled	\N	2026-04-23 07:21:58.538931+00	\N	\N	\N
09ca65da-dcbf-43c5-95ff-118403ca19f8	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-04-21	completed		2026-04-04 00:11:32.325176+00	Step down	Special	\N
bc3edcab-81c8-4cf4-89f8-8c9c92529639	cc922447-2091-48d0-b38e-c0c79df9845e	2026-04-19	completed		2026-04-04 00:11:59.446768+00	Power Servicee	Meeting	\N
04aca4c6-76f8-472f-861f-2d43581abb08	cc922447-2091-48d0-b38e-c0c79df9845e	2026-04-26	completed	\N	2026-04-04 00:11:59.447949+00	\N	\N	\N
1956a434-2530-43a0-963c-9a803828a6c1	34c70508-1a35-45e7-b6ca-32486dc79fec	2026-04-26	completed	\N	2026-04-23 07:21:58.526019+00	\N	\N	\N
94cbfdc4-5dc9-4b56-8b70-a5160623ca0f	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-04-28	completed	\N	2026-04-04 00:11:32.326607+00	\N	\N	\N
4baa57d5-81ec-4cd2-a7c2-55ad6c8e7fd8	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-05-26	scheduled	\N	2026-05-01 19:06:41.342648+00	\N	\N	\N
343ef295-719c-4068-8771-72da7eb96ca5	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-06-02	scheduled	\N	2026-05-01 19:06:41.345601+00	\N	\N	\N
5d8a675c-a32c-4d5c-b8fc-c6491d721c1b	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-06-09	scheduled	\N	2026-05-01 19:06:41.346718+00	\N	\N	\N
98af0650-d723-4f5a-b3d8-e8b768303aa1	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-06-16	scheduled	\N	2026-05-01 19:06:41.347632+00	\N	\N	\N
0512ebe4-507a-4239-af8a-6e4b7af89ad9	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-06-23	scheduled	\N	2026-05-01 19:06:41.348399+00	\N	\N	\N
2be8c6f2-813f-48fb-a450-3cd68e178d60	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-06-30	scheduled	\N	2026-05-01 19:06:41.349127+00	\N	\N	\N
ca353047-4240-4f7e-af14-4fe9399f99fa	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-07-07	scheduled	\N	2026-05-01 19:06:41.35005+00	\N	\N	\N
1c39b6b7-3a62-47d6-ab61-60aad43d38c3	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-07-14	scheduled	\N	2026-05-01 19:06:41.350986+00	\N	\N	\N
abe3797d-475f-4f3a-8b74-4a1171944125	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-07-21	scheduled	\N	2026-05-01 19:06:41.351699+00	\N	\N	\N
f755959c-8e12-4c17-b11f-5d0819f0c77a	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-07-28	scheduled	\N	2026-05-01 19:06:41.352343+00	\N	\N	\N
28bb78c9-2b59-4113-9d8d-c3f0e7b90850	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-08-04	scheduled	\N	2026-05-01 19:06:41.352986+00	\N	\N	\N
0db7c885-ab56-4e94-9f2e-6dba20abcce5	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-08-11	scheduled	\N	2026-05-01 19:06:41.353727+00	\N	\N	\N
f7381295-1887-41e7-b94d-2bf1debe3e34	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-08-18	scheduled	\N	2026-05-01 19:06:41.35457+00	\N	\N	\N
4fc16191-36b6-46d5-b91a-4bac1e5532fb	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-08-25	scheduled	\N	2026-05-01 19:06:41.355218+00	\N	\N	\N
6677e45e-651e-4883-8984-ed1419b57fdb	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-09-01	scheduled	\N	2026-05-01 19:06:41.357181+00	\N	\N	\N
5068f7cc-ab9f-415f-a368-ad86e54f8709	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-09-08	scheduled	\N	2026-05-01 19:06:41.357989+00	\N	\N	\N
3ecf89cf-4f1d-442c-9529-306ffa984505	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-09-15	scheduled	\N	2026-05-01 19:06:41.35874+00	\N	\N	\N
4c1246fe-52f0-4e84-b29d-5f1d100f3393	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-09-22	scheduled	\N	2026-05-01 19:06:41.359403+00	\N	\N	\N
a53b2ccf-0b69-457f-bc61-2b3d273dfb65	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-09-29	scheduled	\N	2026-05-01 19:06:41.359945+00	\N	\N	\N
5f002ae8-b554-4e9f-a815-f5d724f75d90	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-10-06	scheduled	\N	2026-05-01 19:06:41.36064+00	\N	\N	\N
a1e7c3e7-667d-499a-9da7-26d4e50c642a	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-10-13	scheduled	\N	2026-05-01 19:06:41.361255+00	\N	\N	\N
11d3b454-2caf-4512-96dd-ece35340a11a	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-10-20	scheduled	\N	2026-05-01 19:06:41.361986+00	\N	\N	\N
8e2d07c8-efa5-4d91-ad12-2480bac92564	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-10-27	scheduled	\N	2026-05-01 19:06:41.363131+00	\N	\N	\N
0ea54f39-026b-4203-a8d7-a670653fcd38	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-11-03	scheduled	\N	2026-05-01 19:06:41.363865+00	\N	\N	\N
19cfb6fd-e1d4-470f-a07e-5bc6d2fbd6ab	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-11-10	scheduled	\N	2026-05-01 19:06:41.364562+00	\N	\N	\N
c61e8b5f-edba-4410-871d-af427205ad36	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-11-17	scheduled	\N	2026-05-01 19:06:41.365172+00	\N	\N	\N
ac2add2e-dcda-42fc-a4ea-2c58d1be8ab6	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-11-24	scheduled	\N	2026-05-01 19:06:41.365681+00	\N	\N	\N
a69aa1a7-3e77-4cf2-b5cd-46987341aff2	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-12-01	scheduled	\N	2026-05-01 19:06:41.366254+00	\N	\N	\N
0fbc4ba4-463c-4330-9519-a42bdce4ae0f	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-12-08	scheduled	\N	2026-05-01 19:06:41.366928+00	\N	\N	\N
ff0e13c6-8a97-4c8f-a54d-20a2ae0620da	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-12-15	scheduled	\N	2026-05-01 19:06:41.367638+00	\N	\N	\N
9325d2fb-2733-4e12-ab55-702d6f0ae5b7	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-12-22	scheduled	\N	2026-05-01 19:06:41.368284+00	\N	\N	\N
728f6a08-f2c2-48df-ad0e-45011f439530	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2026-12-29	scheduled	\N	2026-05-01 19:06:41.369046+00	\N	\N	\N
c617f745-38f3-428d-a349-4dacb6ae064b	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2027-01-05	scheduled	\N	2026-05-01 19:06:41.369794+00	\N	\N	\N
69e756ed-540d-4b84-98ad-6dabffb73d3d	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2027-01-12	scheduled	\N	2026-05-01 19:06:41.370634+00	\N	\N	\N
9dcf070e-16a0-4496-a1fe-86e45bd33cd3	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2027-01-19	scheduled	\N	2026-05-01 19:06:41.371178+00	\N	\N	\N
3946702f-579c-41be-bea4-e8fa1ae91652	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2027-01-26	scheduled	\N	2026-05-01 19:06:41.371685+00	\N	\N	\N
457ad073-1888-4e8a-86fa-f4aedf6241e1	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2027-02-02	scheduled	\N	2026-05-01 19:06:41.372166+00	\N	\N	\N
94730541-4522-4d4f-b445-f7934e128388	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2027-02-09	scheduled	\N	2026-05-01 19:06:41.37269+00	\N	\N	\N
307de09b-c809-4249-ac21-b1a6e7186d46	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2027-02-16	scheduled	\N	2026-05-01 19:06:41.373224+00	\N	\N	\N
17182169-f141-4089-9571-9b2352cb1e86	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2027-02-23	scheduled	\N	2026-05-01 19:06:41.373726+00	\N	\N	\N
63a688b5-af37-498a-b20c-e61507044553	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2027-03-02	scheduled	\N	2026-05-01 19:06:41.374205+00	\N	\N	\N
7927fcd2-f052-4afb-b4ab-24d2cb1e6cff	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2027-03-09	scheduled	\N	2026-05-01 19:06:41.374687+00	\N	\N	\N
76d030dd-4e52-4de4-8e76-fd388df6d5c4	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2027-03-16	scheduled	\N	2026-05-01 19:06:41.375173+00	\N	\N	\N
e98c8e6b-f58f-4f1a-a722-9072962bb21d	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2027-03-23	scheduled	\N	2026-05-01 19:06:41.375637+00	\N	\N	\N
84d28fec-7dbf-47b2-88c0-5c82fa1ddc47	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2027-03-30	scheduled	\N	2026-05-01 19:06:41.376086+00	\N	\N	\N
d5f5f0ea-7b9d-4a19-a34b-fdbc4dbca385	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2027-04-06	scheduled	\N	2026-05-01 19:06:41.376586+00	\N	\N	\N
14c5c27b-3d42-45b7-ad67-9a7a320a06a9	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2027-04-13	scheduled	\N	2026-05-01 19:06:41.377043+00	\N	\N	\N
0224e9c9-fee0-4096-a248-dea00c2bc9a4	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2027-04-20	scheduled	\N	2026-05-01 19:06:41.377549+00	\N	\N	\N
977133c9-b126-48e9-b94c-62cd552bfc47	9a727e95-b859-4afb-81d7-b8a708ae9ef1	2027-04-27	scheduled	\N	2026-05-01 19:06:41.378039+00	\N	\N	\N
d573ca16-5a8d-43dd-94fb-4d59125e83d2	7727ba22-c291-4fc9-9832-7d846110ad69	2026-05-01	completed		2026-05-01 19:35:32.054388+00	\N	\N	\N
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.events (id, name, type, location, start_time, is_recurring, recurrence_rule, day_of_week, is_active, created_at, updated_at, zone_id) FROM stdin;
cc922447-2091-48d0-b38e-c0c79df9845e	Sunday Service	Service	Main Auditorium	09:00:00	t	weekly	0	t	2026-02-15 13:48:21.677924+00	2026-02-15 13:48:21.677924+00	\N
9a727e95-b859-4afb-81d7-b8a708ae9ef1	Youth Meeting	Service	\N	\N	t	weekly	2	t	2026-04-04 00:11:32.306053+00	2026-04-04 00:11:32.306053+00	5dc15751-2c93-4673-8a85-00b396e1188d
34c70508-1a35-45e7-b6ca-32486dc79fec	zonal meeting	Meeting	Church Auditorium	09:00:00	t	weekly	0	t	2026-04-23 07:21:58.519085+00	2026-04-23 07:21:58.519085+00	15b30798-4cc9-4679-9d9b-64bf7bf7641b
7727ba22-c291-4fc9-9832-7d846110ad69	TBH	Special	Auditorium	09:00:00	f	\N	\N	t	2026-05-01 19:35:32.046255+00	2026-05-01 19:35:32.046255+00	\N
\.


--
-- Data for Name: members; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.members (id, first_name, last_name, email, phone, address, status, zone_id, join_date, avatar_url, notes, dob, gender, role, occupation, emergency_contact, emergency_phone, created_at, updated_at, discovery_source, marital_status, marriage_date, mother_name, mother_status, father_name, father_status, spouse_name, spouse_phone, is_baptized, baptism_date, baptized_by, baptism_method, baptism_church, children) FROM stdin;
8ef35a10-67ea-4676-90d7-cef5f237491b	Akosua	Osei	akosua.osei104@church.org	0137055626	No. 181, Osu Ave, Tamale, Ghana	Active	5dc15751-2c93-4673-8a85-00b396e1188d	2026-02-15	/uploads/avatars/member_1.png	\N	2004-07-18	Female	Deacon	\N	\N	\N	2026-02-15 09:46:51.93344+00	2026-04-03 14:20:45.457779+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
4839e630-2192-4662-ba7a-45b92d1a59eb	Yaa	Mensah	yaa.mensah101@church.org	0519027970	No. 454, East Legon Ave, Cape Coast, Ghana	Active	5dc15751-2c93-4673-8a85-00b396e1188d	2026-02-15	/uploads/avatars/member_4.png	\N	1986-07-08	Female	Worker	\N	\N	\N	2026-02-15 09:46:51.927349+00	2026-02-15 12:29:13.64234+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
82984da0-23cb-4ec2-bbdb-b17658a8c3d6	Akosua	Owusu	akosua.owusu102@church.org	0207452848	No. 397, East Legon Ave, Cape Coast, Ghana	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-02-15	/uploads/avatars/member_3.png	\N	1974-03-20	Female	Worker	\N	\N	\N	2026-02-15 09:46:51.929276+00	2026-02-15 12:29:13.641511+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
90b6ddae-6aa3-4645-9b73-c4aaa50b7e28	Ama	Boateng	ama.boateng103@church.org	0213063294	No. 61, West Legon Ave, Ashiama, Ghana	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-02-15	/uploads/avatars/member_2.png	\N	2006-06-07	Male	Member	\N	\N	\N	2026-02-15 09:46:51.930892+00	2026-02-15 12:29:13.640554+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
720a53b2-f3cd-4b5c-a54f-38fb67843046	Abena	Owusu	abena.owusu@church.org	0551234567	No. 123, Cantonments Ave, Teshie, Ghana	Active	5dc15751-2c93-4673-8a85-00b396e1188d	2026-02-15	/uploads/avatars/member_6.png	\N	2002-06-17	Female	Choir	Nurse	\N	\N	2026-02-15 08:23:48.815149+00	2026-04-03 14:40:36.290867+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
9d74c2db-2788-40b0-b8a1-a77a93eebaaa	Kwame	Owusu	kwame.owusu106@church.org	0698202744	No. 293, Labone Ave, Takoradi, Ghana	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-02-15	/uploads/avatars/member_9.png	\N	2007-05-28	Female	Deacon	\N	\N	\N	2026-02-15 09:46:51.938092+00	2026-02-15 12:29:13.63842+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
aa699563-594c-44c3-a434-c51cf4a77959	Ama	Osei	ama.osei108@church.org	0693250541	No. 445, Airport Residential Ave, Tamale, Ghana	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-02-15	/uploads/avatars/member_7.png	\N	1989-08-25	Female	Choir	\N	\N	\N	2026-02-15 09:46:51.941051+00	2026-02-15 12:29:13.636952+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
8c827a06-2304-46d7-b135-43114562bfe0	Akosua	Darko	akosua.darko109@church.org	0929827470	No. 136, Airport Residential Ave, Accra, Ghana	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-02-15	/uploads/avatars/member_6.png	\N	1962-11-09	Male	Elder	\N	\N	\N	2026-02-15 09:46:51.942543+00	2026-02-15 12:29:13.636228+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
6bc286b8-f294-4375-b9e9-b8e124da0128	Ama	Appiah	ama.appiah111@church.org	0342341259	No. 416, Spintex Ave, Tamale, Ghana	Inactive	5dc15751-2c93-4673-8a85-00b396e1188d	2026-02-15	/uploads/avatars/member_4.png	\N	2004-12-21	Male	Worker	\N	\N	\N	2026-02-15 09:46:51.945931+00	2026-02-15 12:29:13.633459+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
cf5369d9-45f5-44f1-ab68-aac4fd41635f	Emmanuel	Asare	emmanuel.asare112@church.org	0645175550	No. 310, Roman Ridge Ave, Teshie, Ghana	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-02-15	/uploads/avatars/member_3.png	\N	2006-07-16	Female	Usher	\N	\N	\N	2026-02-15 09:46:51.947257+00	2026-02-15 12:29:13.632725+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
7fbb67b0-a4c8-417b-9460-17d56e35f30f	Yaw	Antwi	yaw.antwi113@church.org	0611578246	No. 390, Dzorwulu Ave, Koforidua, Ghana	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-02-15	/uploads/avatars/member_2.png	\N	2004-11-28	Male	Choir	\N	\N	\N	2026-02-15 09:46:51.949094+00	2026-02-15 12:29:13.632065+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
4d6f9740-987b-4233-9cdb-5829f58ec865	Afua	Nyarko	afua.nyarko114@church.org	0158071940	No. 142, Labone Ave, Accra, Ghana	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-02-15	/uploads/avatars/member_1.png	\N	1988-07-16	Female	Member	\N	\N	\N	2026-02-15 09:46:51.951879+00	2026-02-15 12:29:13.63136+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
5c30c6a7-e3f7-4100-bc8c-4d928d30eab8	Kwabena	Nyarko	kwabena.nyarko116@church.org	0951623823	No. 117, Ridge Ave, Kumasi, Ghana	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-02-15	/uploads/avatars/member_9.png	\N	1977-10-16	Female	Member	\N	\N	\N	2026-02-15 09:46:51.956551+00	2026-02-15 12:29:13.629783+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
35556df6-e7e6-404e-ae56-fb4310db7a60	Kojo	Agyemang	kojo.agyemang118@church.org	0417391298	No. 367, Spintex Ave, Accra, Ghana	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-02-15	/uploads/avatars/member_7.png	\N	1964-01-20	Male	Worker	\N	\N	\N	2026-02-15 09:46:51.959675+00	2026-02-15 12:29:13.627366+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
9b45135f-66dc-4b85-84ae-fee9589fdfbd	Kojo	Mensah	kojo.mensah119@church.org	0934299473	No. 482, West Legon Ave, Cape Coast, Ghana	Inactive	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-02-15	/uploads/avatars/member_6.png	\N	1959-04-24	Female	Usher	\N	\N	\N	2026-02-15 09:46:51.960998+00	2026-02-15 12:29:13.626459+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
516cb0f2-5e7d-4575-a349-eb4553fdfd1a	Kojo	Appiah	kojo.appiah121@church.org	0684021708	No. 77, Roman Ridge Ave, Koforidua, Ghana	Active	5dc15751-2c93-4673-8a85-00b396e1188d	2026-02-15	/uploads/avatars/member_4.png	\N	1956-10-24	Male	Deacon	\N	\N	\N	2026-02-15 09:46:51.963959+00	2026-02-15 12:29:13.624591+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
52754c21-c77d-47f2-ba1b-41c815aa6e6e	Adjoa	Osei	adjoa.osei122@church.org	0128494283	No. 314, West Legon Ave, Ashiama, Ghana	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-02-15	/uploads/avatars/member_3.png	\N	1978-05-06	Male	Deacon	\N	\N	\N	2026-02-15 09:46:51.965598+00	2026-02-15 12:29:13.623919+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
36c9118e-7fe8-418a-ba4f-b36a556ad739	Yaw	Asare	yaw.asare123@church.org	0850600386	No. 473, Spintex Ave, Kumasi, Ghana	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-02-15	/uploads/avatars/member_2.png	\N	1979-09-26	Male	Choir	\N	\N	\N	2026-02-15 09:46:51.970222+00	2026-02-15 12:29:13.623048+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
1a592e53-7dd6-4af0-9894-72250ce917e5	Mercy	Antwi	mercy.antwi124@church.org	0696839153	No. 283, Dzorwulu Ave, Koforidua, Ghana	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-02-15	/uploads/avatars/member_1.png	\N	1973-11-14	Male	Elder	\N	\N	\N	2026-02-15 09:46:51.972082+00	2026-02-15 12:29:13.622253+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
091ab23f-e9a4-48be-8a48-2e0678cf2c0b	Kweku	Boateng	kweku.boateng126@church.org	0549194012	No. 205, Ridge Ave, Accra, Ghana	Active	5dc15751-2c93-4673-8a85-00b396e1188d	2026-02-15	/uploads/avatars/member_9.png	\N	1981-12-21	Female	Deacon	\N	\N	\N	2026-02-15 09:46:51.975291+00	2026-02-15 12:29:13.620613+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
b33ac6a1-ad05-43c6-a501-d81f9c092e08	Mercy	Antwi	mercy.antwi128@church.org	0336673810	No. 110, Ridge Ave, Tamale, Ghana	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-02-15	/uploads/avatars/member_7.png	\N	1971-12-12	Male	Elder	\N	\N	\N	2026-02-15 09:46:51.977863+00	2026-02-15 12:29:13.618366+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
edeb8bef-0de0-4945-bf9d-0990c534548f	Yaw	Amoah	yaw.amoah129@church.org	0362129660	No. 181, Cantonments Ave, Tema, Ghana	Active	5dc15751-2c93-4673-8a85-00b396e1188d	2026-02-15	/uploads/avatars/member_6.png	\N	1962-12-02	Male	Worker	\N	\N	\N	2026-02-15 09:46:51.979184+00	2026-02-15 12:29:13.616309+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
f04e4888-b586-41ab-82a3-0bf3d4b372fd	Abena	Darko	abena.darko131@church.org	0553144702	No. 44, Labone Ave, Tema, Ghana	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-02-15	/uploads/avatars/member_4.png	\N	1997-08-17	Male	Elder	\N	\N	\N	2026-02-15 09:46:51.981505+00	2026-02-15 12:29:13.613225+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
488f0e42-25f8-4261-ba5e-b4cfe6d26768	Esi	Sarpong	esi.sarpong132@church.org	0150546188	No. 47, Spintex Ave, Ashiama, Ghana	Inactive	5dc15751-2c93-4673-8a85-00b396e1188d	2026-02-15	/uploads/avatars/member_3.png	\N	1965-01-04	Female	Elder	\N	\N	\N	2026-02-15 09:46:51.983322+00	2026-02-15 12:29:13.611955+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
ff3d4053-41de-40fe-9746-186ffff357f6	Kofi	Opoku	kofi.opoku133@church.org	0917388295	No. 171, Ridge Ave, Takoradi, Ghana	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-02-15	/uploads/avatars/member_2.png	\N	1993-05-22	Female	Usher	\N	\N	\N	2026-02-15 09:46:51.98492+00	2026-02-15 12:29:13.610598+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
33f21265-52c2-4f15-b51f-cdb93d16ca04	Kwame	Darko	kwame.darko134@church.org	0555165932	No. 240, Spintex Ave, Tamale, Ghana	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-02-15	/uploads/avatars/member_1.png	\N	1952-11-20	Male	Worker	\N	\N	\N	2026-02-15 09:46:51.987594+00	2026-02-15 12:29:13.60898+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
d79c2b16-0e00-4593-a43a-78c2c8da8817	Abena	Antwi	abena.antwi136@church.org	0302287917	No. 13, Osu Ave, Cape Coast, Ghana	Active	5dc15751-2c93-4673-8a85-00b396e1188d	2026-02-15	/uploads/avatars/member_9.png	\N	2007-10-19	Female	Elder	\N	\N	\N	2026-02-15 09:46:51.990441+00	2026-02-15 12:29:13.607019+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
dbc20e3d-a48b-4e63-a0c9-abd4dc6d6543	Samuel	Agyemang	samuel.agyemang138@church.org	0528362129	No. 94, Ridge Ave, Tamale, Ghana	Active	5dc15751-2c93-4673-8a85-00b396e1188d	2026-02-15	/uploads/avatars/member_7.png	\N	2000-11-04	Female	Deacon	\N	\N	\N	2026-02-15 09:46:51.993717+00	2026-02-15 12:29:13.603878+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
6b7d5092-440e-4a79-9fc9-550b39e5519f	Yaa	Sarpong	yaa.sarpong139@church.org	0210136119	No. 272, Osu Ave, Cape Coast, Ghana	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-02-15	/uploads/avatars/member_6.png	\N	1977-08-22	Female	Member	\N	\N	\N	2026-02-15 09:46:51.99486+00	2026-02-15 12:29:13.602163+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
38ead3c8-9e0f-47c4-ac71-194ba892b5da	Kwame	Antwi	kwame.antwi141@church.org	0698085068	No. 279, Labone Ave, Takoradi, Ghana	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-02-15	/uploads/avatars/member_4.png	\N	1992-01-28	Male	Deacon	\N	\N	\N	2026-02-15 09:46:51.997471+00	2026-02-15 12:29:13.598572+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
863813d9-8c10-494c-a5c6-b6accef7314a	Emmanuel	Mensah	emmanuel.mensah100@church.org	0710160001	No. 402, West Legon Ave, Cape Coast, Ghana	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-02-15	/uploads/avatars/member_5.png	\N	1954-12-28	Female	Choir	\N	\N	\N	2026-02-15 09:46:51.924059+00	2026-02-15 12:29:13.643286+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
e69d3e35-89cb-4395-b991-53e7a22a2c2a	Jane 	Doe	\N	0545426855	\N	Visitor	\N	2026-02-15	\N	\N	\N	\N	Member	\N	\N	\N	2026-02-15 16:20:32.929453+00	2026-02-15 16:20:32.929453+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
8f03d958-9a3a-490d-b6f2-85123632399d	Akosua	Nyarko	akosua.nyarko144@church.org	0706091295	No. 30, Dzorwulu Ave, Kumasi, Ghana	Active	5dc15751-2c93-4673-8a85-00b396e1188d	2026-02-15	/uploads/avatars/member_1.png	\N	1963-10-27	Female	Elder	\N	\N	\N	2026-02-15 09:46:52.004546+00	2026-02-15 12:29:13.592197+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
535078bb-6ef1-4235-b32d-133943d4cb81	Yaa	Boateng	yaa.boateng143@church.org	0725447079	No. 498, East Legon Ave, Cape Coast, Ghana	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-02-15	/uploads/avatars/member_2.png	\N	1982-11-01	Female	Elder	\N	\N	\N	2026-02-15 09:46:52.002065+00	2026-02-15 12:29:13.595045+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
02b151d6-a96e-4cd0-a602-8b2c0583b84a	Akosua	Boakye	akosua.boakye140@church.org	0397754258	No. 156, Cantonments Ave, Tema, Ghana	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-02-15	/uploads/avatars/member_5.png	\N	1958-02-14	Female	Worker	\N	\N	\N	2026-02-15 09:46:51.996237+00	2026-02-15 12:29:13.599836+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
693d768d-ad3e-491d-8c45-831213996acc	Kofi	Amoah	kofi.amoah137@church.org	0216412577	No. 496, Airport Residential Ave, Koforidua, Ghana	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-02-15	/uploads/avatars/member_8.png	\N	1997-03-04	Female	Worker	\N	\N	\N	2026-02-15 09:46:51.992397+00	2026-02-15 12:29:13.605163+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
e9d0d907-130a-4c21-b761-ab8991478e05	Mary	Darko	mary.darko135@church.org	0244878945	No. 142, Airport Residential Ave, Takoradi, Ghana	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-02-15	/uploads/avatars/member_10.png	\N	2001-05-19	Female	Usher	\N	\N	\N	2026-02-15 09:46:51.989118+00	2026-02-15 12:29:13.607893+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
6c191aeb-ce3b-43f5-8bdd-345c5e113a54	Adjoa	Opoku	adjoa.opoku130@church.org	0403225895	No. 183, West Legon Ave, Tamale, Ghana	Active	5dc15751-2c93-4673-8a85-00b396e1188d	2026-02-15	/uploads/avatars/member_5.png	\N	1971-04-23	Female	Deacon	\N	\N	\N	2026-02-15 09:46:51.980407+00	2026-02-15 12:29:13.614922+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
b28ccc7b-3f6d-4a79-9d85-7a518980ac97	Kwabena	Frimpong	kwabena.frimpong127@church.org	0153215777	No. 361, Osu Ave, Accra, Ghana	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-02-15	/uploads/avatars/member_8.png	\N	1958-11-09	Female	Deacon	\N	\N	\N	2026-02-15 09:46:51.976699+00	2026-02-15 12:29:13.619625+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
562b9fbe-ee15-4c44-ae30-ee6ee3bc0e47	Samuel	Opoku	samuel.opoku125@church.org	0926162830	No. 281, Airport Residential Ave, Ashiama, Ghana	Inactive	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-02-15	/uploads/avatars/member_10.png	\N	1983-05-14	Male	Usher	\N	\N	\N	2026-02-15 09:46:51.97353+00	2026-02-15 12:29:13.621375+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
014d5112-0352-4883-ab22-1b5a5747930c	Kweku	Mensah	kweku.mensah120@church.org	0617867946	No. 252, Dzorwulu Ave, Teshie, Ghana	Inactive	5dc15751-2c93-4673-8a85-00b396e1188d	2026-02-15	/uploads/avatars/member_5.png	\N	1957-04-20	Male	Elder	\N	\N	\N	2026-02-15 09:46:51.962477+00	2026-02-15 12:29:13.625539+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
576cb393-5376-4549-a760-5472e3acd534	Samuel	Appiah	samuel.appiah117@church.org	0925574216	No. 473, East Legon Ave, Kumasi, Ghana	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-02-15	/uploads/avatars/member_8.png	\N	1984-03-07	Female	Elder	\N	\N	\N	2026-02-15 09:46:51.958135+00	2026-02-15 12:29:13.628524+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
4dd1716f-7caa-438f-9667-68319fbb8dfc	Esi	Darko	esi.darko115@church.org	0503150425	No. 287, Labone Ave, Koforidua, Ghana	Inactive	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-02-15	/uploads/avatars/member_10.png	\N	1997-12-18	Male	Member	\N	\N	\N	2026-02-15 09:46:51.955086+00	2026-02-15 12:29:13.630662+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
df4d7dbe-1980-42d6-a0ad-662aa212937b	Kwabena	Boateng	kwabena.boateng110@church.org	0375123024	No. 22, East Legon Ave, Tema, Ghana	Active	5dc15751-2c93-4673-8a85-00b396e1188d	2026-02-15	/uploads/avatars/member_5.png	\N	2005-03-21	Male	Elder	\N	\N	\N	2026-02-15 09:46:51.944638+00	2026-02-15 12:29:13.635169+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
d9db6e95-ef45-4881-a4a6-055cf0390f19	Joseph	Opoku	joseph.opoku107@church.org	0102401114	No. 220, Roman Ridge Ave, Koforidua, Ghana	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-02-15	/uploads/avatars/member_8.png	\N	2004-05-08	Female	Choir	\N	\N	\N	2026-02-15 09:46:51.939603+00	2026-02-15 12:29:13.637684+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
a1e07244-e38d-442b-a1d6-94ca13943e82	Kwame	Nyarko	kwame.nyarko105@church.org	0869596041	No. 345, East Legon Ave, Cape Coast, Ghana	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-02-15	/uploads/avatars/member_10.png	\N	2005-06-15	Female	Member	\N	\N	\N	2026-02-15 09:46:51.935708+00	2026-02-15 12:29:13.639098+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
5428c909-06c2-4010-bf7f-005896b19902	Ama	Owusu	ama.owusu100@church.org	0115687940	\N	Inactive	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-04-03	\N	\N	\N	Female	Member	\N	\N	\N	2026-04-03 13:24:02.031102+00	2026-04-03 13:24:02.031102+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
ad42efc1-51e5-4f75-a624-4fb81beca647	Abena	Nyarko	abena.nyarko101@church.org	0716724841	\N	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-04-03	\N	\N	\N	Female	Usher	\N	\N	\N	2026-04-03 13:24:02.035218+00	2026-04-03 13:24:02.035218+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
906fde9e-b04b-4031-837e-36cbac155300	Yaa	Agyemang	yaa.agyemang102@church.org	0207045146	\N	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-04-03	\N	\N	\N	Male	Choir	\N	\N	\N	2026-04-03 13:24:02.037461+00	2026-04-03 13:24:02.037461+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
79c52aec-97e1-4fd2-8c71-b7327731f172	Mary	Sarpong	mary.sarpong103@church.org	0924953166	\N	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-04-03	\N	\N	\N	Female	Usher	\N	\N	\N	2026-04-03 13:24:02.039304+00	2026-04-03 13:24:02.039304+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
5eb6e650-de79-4b6b-98f0-855bb843d28b	Adjoa	Opoku	adjoa.opoku105@church.org	0518344788	\N	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-04-03	\N	\N	\N	Male	Choir	\N	\N	\N	2026-04-03 13:24:02.043152+00	2026-04-03 13:24:02.043152+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
89eb487d-0c54-48b6-b117-b1d1c547a375	Kojo	Osei	kojo.osei106@church.org	0616384955	\N	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-04-03	\N	\N	\N	Male	Worker	\N	\N	\N	2026-04-03 13:24:02.044864+00	2026-04-03 13:24:02.044864+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
b3bcb223-fd26-4dea-92a2-ebcca0acc482	Joseph	Agyemang	joseph.agyemang107@church.org	0311207596	\N	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-04-03	\N	\N	\N	Female	Usher	\N	\N	\N	2026-04-03 13:24:02.046277+00	2026-04-03 13:24:02.046277+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
6742f6a8-b6d1-4cf5-bda6-aa289f115417	Kwabena	Darko	kwabena.darko108@church.org	0920233037	\N	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-04-03	\N	\N	\N	Male	Member	\N	\N	\N	2026-04-03 13:24:02.047549+00	2026-04-03 13:24:02.047549+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
53637bf2-b83d-481c-848a-04e48cc4a2e3	Mercy	Antwi	mercy.antwi109@church.org	0501277842	\N	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-04-03	\N	\N	\N	Male	Worker	\N	\N	\N	2026-04-03 13:24:02.04955+00	2026-04-03 13:24:02.04955+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
4e6b6c3d-83a3-4afd-9c8d-0e8d96542711	Yaa	Boateng	yaa.boateng110@church.org	0618749887	\N	Active	5dc15751-2c93-4673-8a85-00b396e1188d	2026-04-03	\N	\N	\N	Female	Deacon	\N	\N	\N	2026-04-03 13:24:02.051155+00	2026-04-03 13:24:02.051155+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
3f5b50a9-9323-47ce-a139-bc83c63d13d8	Ama	Owusu	ama.owusu111@church.org	0703873778	\N	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-04-03	\N	\N	\N	Female	Worker	\N	\N	\N	2026-04-03 13:24:02.052466+00	2026-04-03 13:24:02.052466+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
564e455d-bea1-4952-a3b5-5fb58703d8dd	Abena	Nyarko	abena.nyarko112@church.org	0267339763	\N	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-04-03	\N	\N	\N	Female	Elder	\N	\N	\N	2026-04-03 13:24:02.053728+00	2026-04-03 13:24:02.053728+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
fa07fdd3-2eb3-4d4c-8111-b9a6b8087b79	Kweku	Boakye	kweku.boakye113@church.org	0447622148	\N	Inactive	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-04-03	\N	\N	\N	Female	Elder	\N	\N	\N	2026-04-03 13:24:02.05506+00	2026-04-03 13:24:02.05506+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
b2c6238a-a4d6-4fe5-9170-6830000c0509	Kojo	Darko	kojo.darko114@church.org	0201482365	\N	Inactive	5dc15751-2c93-4673-8a85-00b396e1188d	2026-04-03	\N	\N	\N	Female	Usher	\N	\N	\N	2026-04-03 13:24:02.056288+00	2026-04-03 13:24:02.056288+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
9d33ccca-d15e-4151-949f-c0a1b43da1f1	Mercy	Antwi	mercy.antwi115@church.org	0885675806	\N	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-04-03	\N	\N	\N	Female	Worker	\N	\N	\N	2026-04-03 13:24:02.057728+00	2026-04-03 13:24:02.057728+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
5f09834c-f34b-4dde-81e6-e65ef2066752	Adjoa	Antwi	adjoa.antwi116@church.org	0308882913	\N	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-04-03	\N	\N	\N	Male	Usher	\N	\N	\N	2026-04-03 13:24:02.059264+00	2026-04-03 13:24:02.059264+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
90df92e6-4f25-4735-a4b4-8b0f4b0aff72	Samuel	Frimpong	samuel.frimpong117@church.org	0997053954	\N	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-04-03	\N	\N	\N	Female	Choir	\N	\N	\N	2026-04-03 13:24:02.06094+00	2026-04-03 13:24:02.06094+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
eab8a7db-0621-4bf7-b083-769e7b3f042b	Yaa	Boakye	yaa.boakye118@church.org	0404155450	\N	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-04-03	\N	\N	\N	Male	Elder	\N	\N	\N	2026-04-03 13:24:02.062136+00	2026-04-03 13:24:02.062136+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
5a9a29ef-c904-428e-8d3f-9bf0916187d7	Esi	Boakye	esi.boakye119@church.org	0256384672	\N	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-04-03	\N	\N	\N	Male	Elder	\N	\N	\N	2026-04-03 13:24:02.063633+00	2026-04-03 13:24:02.063633+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
4e39a502-8a5a-4e59-a94f-b2cec0e067cb	Ama	Opoku	ama.opoku120@church.org	0130957300	\N	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-04-03	\N	\N	\N	Male	Member	\N	\N	\N	2026-04-03 13:24:02.064756+00	2026-04-03 13:24:02.064756+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
3224941f-9553-4af5-b319-ed9542b5632d	Kwesi	Osei	kwesi.osei121@church.org	0107946632	\N	Active	5dc15751-2c93-4673-8a85-00b396e1188d	2026-04-03	\N	\N	\N	Male	Deacon	\N	\N	\N	2026-04-03 13:24:02.067344+00	2026-04-03 13:24:02.067344+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
9cefd8dd-167a-40ea-8c51-63db4a783cc2	Abena	Boakye	abena.boakye122@church.org	0272991732	\N	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-04-03	\N	\N	\N	Female	Worker	\N	\N	\N	2026-04-03 13:24:02.068748+00	2026-04-03 13:24:02.068748+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
c75b9d7d-c39b-42ca-9379-ec9f55092339	Kweku	Agyemang	kweku.agyemang123@church.org	0649188270	\N	Inactive	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-04-03	\N	\N	\N	Female	Worker	\N	\N	\N	2026-04-03 13:24:02.069975+00	2026-04-03 13:24:02.069975+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
4a17d4fa-b195-4acc-971d-ce940c442fa6	Kwesi	Antwi	kwesi.antwi124@church.org	0134411453	\N	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-04-03	\N	\N	\N	Male	Worker	\N	\N	\N	2026-04-03 13:24:02.071093+00	2026-04-03 13:24:02.071093+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
0cbd5268-54a2-45e7-9561-ec90a67f4f16	Mercy	Darko	mercy.darko125@church.org	0394806522	\N	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-04-03	\N	\N	\N	Male	Deacon	\N	\N	\N	2026-04-03 13:24:02.072331+00	2026-04-03 13:24:02.072331+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
6c6df2c9-1bcd-4cb7-b73e-c06e07996152	Adjoa	Nyarko	adjoa.nyarko126@church.org	0244486887	\N	Inactive	5dc15751-2c93-4673-8a85-00b396e1188d	2026-04-03	\N	\N	\N	Female	Elder	\N	\N	\N	2026-04-03 13:24:02.07426+00	2026-04-03 13:24:02.07426+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
26fa122e-2886-4a13-a383-ccdd17165096	Esi	Opoku	esi.opoku127@church.org	0601685870	\N	Inactive	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-04-03	\N	\N	\N	Male	Deacon	\N	\N	\N	2026-04-03 13:24:02.075461+00	2026-04-03 13:24:02.075461+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
2e2e6441-ba16-4ec7-9ce3-19773fb8e9e3	Emmanuel	Asare	emmanuel.asare128@church.org	0778357609	\N	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-04-03	\N	\N	\N	Male	Elder	\N	\N	\N	2026-04-03 13:24:02.076528+00	2026-04-03 13:24:02.076528+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
5735fea6-39cd-4e6b-8d06-f0a9ed57725c	Samuel	Boateng	samuel.boateng129@church.org	0788476083	\N	Inactive	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-04-03	\N	\N	\N	Female	Member	\N	\N	\N	2026-04-03 13:24:02.079008+00	2026-04-03 13:24:02.079008+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
e493f6a5-e32d-460d-a5b3-efccc3129564	Yaw	Boateng	yaw.boateng130@church.org	0276670595	\N	Active	5dc15751-2c93-4673-8a85-00b396e1188d	2026-04-03	\N	\N	\N	Male	Worker	\N	\N	\N	2026-04-03 13:24:02.08081+00	2026-04-03 13:24:02.08081+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
4518b3c8-7ac5-4a17-8261-64ac71a52986	Kwame	Agyemang	kwame.agyemang131@church.org	0449339482	\N	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-04-03	\N	\N	\N	Female	Elder	\N	\N	\N	2026-04-03 13:24:02.082331+00	2026-04-03 13:24:02.082331+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
912ee983-7789-4e07-b149-75fee15996f9	Grace	Nyarko	grace.nyarko132@church.org	0962454323	\N	Inactive	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-04-03	\N	\N	\N	Male	Deacon	\N	\N	\N	2026-04-03 13:24:02.083561+00	2026-04-03 13:24:02.083561+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
855ee4bf-42d2-44c2-b224-b5560c17d1ba	Abena	Opoku	abena.opoku133@church.org	0992880486	\N	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-04-03	\N	\N	\N	Male	Choir	\N	\N	\N	2026-04-03 13:24:02.084816+00	2026-04-03 13:24:02.084816+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
dd9e2d1c-13c7-4b59-a5d6-e03cc6710d25	Akosua	Darko	akosua.darko134@church.org	0268118028	\N	Active	5dc15751-2c93-4673-8a85-00b396e1188d	2026-04-03	\N	\N	\N	Female	Choir	\N	\N	\N	2026-04-03 13:24:02.085849+00	2026-04-03 13:24:02.085849+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
6e0c200f-13cb-4eb9-b83c-f9150bfd8fdd	Kwabena	Sarpong	kwabena.sarpong135@church.org	0837272792	\N	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-04-03	\N	\N	\N	Male	Deacon	\N	\N	\N	2026-04-03 13:24:02.08743+00	2026-04-03 13:24:02.08743+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
915c5d0e-3424-46a2-9347-b4b0e62ac9f4	Emmanuel	Mensah	emmanuel.mensah136@church.org	0763190286	\N	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-04-03	\N	\N	\N	Male	Worker	\N	\N	\N	2026-04-03 13:24:02.0886+00	2026-04-03 13:24:02.0886+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
56971814-ef63-4f9a-8685-4000c7e4ede0	Emmanuel	Amoah	emmanuel.amoah137@church.org	0726393818	\N	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-04-03	\N	\N	\N	Female	Choir	\N	\N	\N	2026-04-03 13:24:02.089811+00	2026-04-03 13:24:02.089811+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
c63ec70f-d9bb-45a8-b3c4-4fb56e0ac100	Mary	Osei	mary.osei138@church.org	0422556445	\N	Inactive	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-04-03	\N	\N	\N	Female	Elder	\N	\N	\N	2026-04-03 13:24:02.091083+00	2026-04-03 13:24:02.091083+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
89539369-06c5-43eb-8360-3a4ee942ea33	Emmanuel	Agyemang	emmanuel.agyemang139@church.org	0983054081	\N	Active	5dc15751-2c93-4673-8a85-00b396e1188d	2026-04-03	\N	\N	\N	Male	Elder	\N	\N	\N	2026-04-03 13:24:02.092259+00	2026-04-03 13:24:02.092259+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
33ae8d11-e4e8-48bd-b958-cb6dc080600b	Kwesi	Sarpong	kwesi.sarpong140@church.org	0537593298	\N	Active	71e242d4-a4b3-4538-85d8-d5af47b5c7c0	2026-04-03	\N	\N	\N	Female	Deacon	\N	\N	\N	2026-04-03 13:24:02.093381+00	2026-04-03 13:24:02.093381+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
3e8964ae-9aa6-45cf-a3d1-78c480eead41	Afua	Amoah	afua.amoah141@church.org	0873026192	\N	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-04-03	\N	\N	\N	Female	Choir	\N	\N	\N	2026-04-03 13:24:02.095407+00	2026-04-03 13:24:02.095407+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
cbead35d-9580-477d-8f02-33ac684e2887	Kwesi	Nyarko	kwesi.nyarko142@church.org	0365504382	\N	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-04-03	\N	\N	\N	Female	Choir	\N	\N	\N	2026-04-03 13:24:02.098014+00	2026-04-03 13:24:02.098014+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
76c9f24f-8bbf-45fe-ba12-2ed68e288947	John	Mensah	john.mensah@church.org	0241234567	No. 162, West Legon Ave, Teshie, Ghana	Active	7155cccf-65ac-4e36-a895-f36da8f1768a	2026-02-15	/uploads/avatars/member_7.png	\N	1985-07-23	Male	Member	Teacher	\N	\N	2026-02-15 08:23:39.387554+00	2026-04-03 14:40:47.855403+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
b912439b-d038-4fcc-abb0-7bde08bb5bbb	Kwabena	Amoah	kwabena.amoah142@church.org	0956202251	No. 100, Labone Ave, Accra, Ghana	Active	5dc15751-2c93-4673-8a85-00b396e1188d	2026-02-15	/uploads/avatars/member_3.png	\N	1967-09-26	Male	Deacon	Teacher	\N	\N	2026-02-15 09:46:51.99846+00	2026-04-04 22:51:12.051473+00	Evangelism Outreach	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
83dc0b9f-1b71-46aa-913e-b5256f824a08	Kwabena	Nyarko	kwabena.nyarko104@church.org	0133718336	123 Abenkwan street 12	Active	5dc15751-2c93-4673-8a85-00b396e1188d	2026-04-03	\N	not really	\N	Female	Member	Student	\N	\N	2026-04-03 13:24:02.041277+00	2026-04-04 22:58:12.670916+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
fe3e9f12-9434-4161-8489-40ef8229e69b	Grace	Nyarko	grace.nyarko143@church.org	0557033127	\N	Inactive	15b30798-4cc9-4679-9d9b-64bf7bf7641b	2026-04-03	\N	\N	\N	Male	Member	\N	\N	\N	2026-04-03 13:24:02.099548+00	2026-04-23 07:13:52.13321+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
5681c0d6-4234-4df1-ba40-59342e8dbd8c	Yaw	Darko	yaa.darko144@church.org	0596395852	Adenta  New Site	Active	5dc15751-2c93-4673-8a85-00b396e1188d	2026-04-03	\N	nope	\N	Male	Worker	Engineer	\N	\N	2026-04-03 13:24:02.101067+00	2026-04-25 23:22:51.922752+00	Evangelism Outreach	Married	2026-04-15	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
ee9f2f48-0b93-4f61-8bda-98db600d889c	Victor	Adotey	\N	0545426855	\N	Visitor	\N	2026-04-26	\N	\N	\N	\N	Member	\N	\N	\N	2026-04-26 11:10:54.364575+00	2026-04-26 11:10:54.364575+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
818c99d2-4334-4704-be01-1d7a3333d7aa	Daniel	Oti	bugebongo@gmail.com	0505743958	close to. eye. 360, ofankor hills	Active	5dc15751-2c93-4673-8a85-00b396e1188d	2026-02-18	\N	\N	1989-07-21	\N	member	Banker	Mercy Pinamang	0233455667	2026-02-18 07:47:31.823281+00	2026-04-27 07:57:27.724325+00	\N	Married	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	[]
04ef5364-e521-438d-8be8-e41a165c7845	Parent	Test	parenttest@example.com	\N	\N	Active	\N	2026-04-30	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-30 14:41:23.267833+00	2026-04-30 14:41:23.267833+00	\N	\N	\N	Mary Test	Alive	John Test	Deceased	\N	\N	f	\N	\N	\N	\N	[]
85332342-5823-4e59-a855-9aabba1961ff	Spouse	Test	spousetest@example.com	\N	\N	Active	\N	2026-04-30	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-30 15:44:49.910557+00	2026-04-30 15:44:49.910557+00	\N	Married	2010-05-15	\N	\N	\N	\N	Jane Test	123-456-7890	f	\N	\N	\N	\N	[]
e4b3b739-b2f4-4baa-bd99-605a80c85bcb	Baptism	Test	baptismtest@example.com	\N	\N	Active	\N	2026-04-30	\N	\N	\N	\N	\N	\N	\N	\N	2026-04-30 15:55:41.258674+00	2026-04-30 15:55:41.258674+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	2023-01-10	Pastor John	Immersion	First Church	[]
0e64e6a9-3738-48cc-af92-77dd272c0165	Abdallah	Yakubu	abdallahyakubu491@gmail.com	0203461188	7 chickweed ST\nMadina	Active	2ff93959-0913-4c5d-a888-d4ee90df96d7	2026-04-26	\N	none	2001-04-30	\N	Media	IT Technician	test	123456789	2026-04-26 11:03:31.507639+00	2026-04-30 16:39:15.292161+00	Friend/Family Invitation	Married	2025-04-30	Mama Abdul	Alive	Papa Abdul	Alive	Wife Abdul	12345	f	\N	\N	\N	\N	[{"name": "Kiddie Abdul", "phone": "0123456"}]
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, content, channel, recipient_type, recipient_target, recipient_label, recipient_count, status, type, sent_at, sender_user_id, sender_role, sender_zone_id) FROM stdin;
fefa1695-ae2a-41d9-bcca-69dd40064902	Another test sms to check for consistency	sms	individual	5681c0d6-4234-4df1-ba40-59342e8dbd8c	Yaw Darko	1	sent	manual	2026-04-13 20:24:04.36568+00	\N	\N	\N
34c5d6df-2c28-44f8-afb0-7fad911bb6aa	nbvbnv	email	all	\N	Email Recipients	0	sent	manual	2026-04-13 20:24:37.500893+00	\N	\N	\N
51d02024-a3ad-4578-885b-b0f701daf44d	yet again another test, had 4 left tho	sms	individual	5681c0d6-4234-4df1-ba40-59342e8dbd8c	Yaw Darko	1	sent	manual	2026-04-13 20:27:06.231007+00	\N	\N	\N
35d19923-d6ed-4484-80a4-447276676d56	Tuesdays 7:13pm test sms	sms	individual	5681c0d6-4234-4df1-ba40-59342e8dbd8c	Yaw Darko	1	sent	manual	2026-04-14 19:13:29.434377+00	\N	\N	\N
6bd465c4-e0a0-481c-8688-03ebba76cc2c	done	sms	individual	5681c0d6-4234-4df1-ba40-59342e8dbd8c	Yaw Darko	1	sent	manual	2026-04-25 20:52:44.480495+00	\N	\N	\N
8af1bb32-e805-4baa-b548-dd0f8af6e006	Hi [FirstName], Happy Birthday and God bless you! so much dear	sms	individual	5681c0d6-4234-4df1-ba40-59342e8dbd8c	Yaw Darko	1	sent	manual	2026-04-25 23:43:33.547337+00	\N	\N	\N
8a14aeb8-2461-4605-a461-47dd157009a5	After optimisations	sms	individual	5681c0d6-4234-4df1-ba40-59342e8dbd8c	Yaw Darko	1	sent	manual	2026-04-26 08:18:37.117467+00	\N	\N	\N
295e2d5a-a7ee-407e-b362-2e440885b14f	SMS automated test from Ecclesia : )	sms	individual	818c99d2-4334-4704-be01-1d7a3333d7aa	Daniel Oti	1	sent	manual	2026-04-26 08:24:57.24004+00	b1a8e358-fea2-4fca-aebe-7694c879241d	zone_leader	5dc15751-2c93-4673-8a85-00b396e1188d
7bcbf43e-0af7-47c6-b66c-4ef528bd0cc1	Test	sms	individual	0e64e6a9-3738-48cc-af92-77dd272c0165	Abdallah Yakubu	1	sent	manual	2026-04-26 11:08:17.666745+00	be262056-7a00-42d9-be6f-5d3b160c521c	admin	\N
530b550e-fbdc-4123-bd7d-f29264e25ffd	sormi	sms	individual	0e64e6a9-3738-48cc-af92-77dd272c0165	Abdallah Yakubu	1	sent	manual	2026-04-26 11:08:48.53849+00	be262056-7a00-42d9-be6f-5d3b160c521c	admin	\N
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.migrations (id, name, applied_at) FROM stdin;
1	001_create_members.sql	2026-02-15 08:22:01.614622+00
2	002_create_zones.sql	2026-02-15 09:38:54.96993+00
3	003_create_events.sql	2026-02-15 13:43:34.723079+00
4	005_make_email_optional.sql	2026-02-15 16:19:29.622956+00
5	006_add_zone_leader_fk.sql	2026-04-03 10:03:42.946069+00
6	007_create_users.sql	2026-04-03 12:38:33.703378+00
7	008_add_event_zone_id.sql	2026-04-03 15:07:39.267277+00
8	009_fix_members_zone_id_type.sql	2026-04-06 01:46:53.248668+00
9	010_instance_overrides.sql	2026-04-06 01:46:53.253687+00
10	011_member_demographics.sql	2026-04-06 01:46:53.257612+00
11	012_add_location_override.sql	2026-04-06 01:46:53.262486+00
12	013_settings.sql	2026-04-13 05:09:17.433462+00
13	014_create_messages.sql	2026-04-13 19:10:43.53245+00
14	015_add_member_marital_fields.sql	2026-04-25 23:20:12.411693+00
15	016_add_anniversary_template.sql	2026-04-25 23:41:20.89914+00
16	017_add_automation_toggle_settings.sql	2026-04-25 23:41:20.900843+00
17	018_add_message_sender_fields.sql	2026-04-26 08:19:17.251357+00
18	019_add_member_parents_fields.sql	2026-04-30 14:39:14.898748+00
19	020_add_member_spouse_fields.sql	2026-04-30 15:42:52.393169+00
20	021_add_member_baptism_fields.sql	2026-04-30 15:53:10.153143+00
21	022_add_member_children_field.sql	2026-04-30 16:23:29.487435+00
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.settings (id, key, value, updated_at) FROM stdin;
1	birthday_sms_template	Hi [FirstName], Happy Birthday and God bless you! so much dear	2026-04-14 19:12:43.547831+00
2	absentee_sms_template	Hello [FirstName], we missed you at service. See you next time!	2026-04-14 19:12:43.551686+00
7	anniversary_sms_template	Hi [FirstName], happy wedding anniversary! Wishing you many more blessed years together.	2026-04-25 23:41:20.895444+00
8	automated_sms_enabled	true	2026-04-25 23:41:20.900299+00
9	birthday_sms_enabled	true	2026-04-25 23:41:20.900299+00
10	anniversary_sms_enabled	true	2026-04-25 23:41:20.900299+00
11	absentee_sms_enabled	true	2026-04-25 23:41:20.900299+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, name, email, password_hash, role, member_id, zone_id, created_at, updated_at) FROM stdin;
b1a8e358-fea2-4fca-aebe-7694c879241d	Daniel Oti	danieloti@church.com	$2b$10$4ho/XSOG.csp5B9MoKfGuOvb.Rcy1NQmU2PT/R.G3nS4i4IKoUN0.	zone_leader	818c99d2-4334-4704-be01-1d7a3333d7aa	5dc15751-2c93-4673-8a85-00b396e1188d	2026-04-03 15:08:28.154233+00	2026-04-03 15:08:28.154233+00
be262056-7a00-42d9-be6f-5d3b160c521c	Josiah Agyapong	jojo@church.com	$2b$10$RQf8FwxFL1iGF4Z.kdqhdOHO//qdQA6mrWJNJ4zkAp1V4BqcuhCaW	admin	\N	\N	2026-04-03 13:24:02.199059+00	2026-04-14 19:05:33.123654+00
a2e601d0-9ff0-4791-95aa-a3dd21cf33e7	Grace Nyarko	you@me.com	$2b$10$vpRv.saDbKTH5D8FDeCJ.uKf7HcPL84hEuJ9Ebq1DIYyPFP6fsgmK	zone_leader	fe3e9f12-9434-4161-8489-40ef8229e69b	15b30798-4cc9-4679-9d9b-64bf7bf7641b	2026-04-23 07:13:52.240907+00	2026-04-23 07:13:52.240907+00
\.


--
-- Data for Name: zones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.zones (id, name, leader, description, meeting_time, created_at, updated_at, leader_id) FROM stdin;
7155cccf-65ac-4e36-a895-f36da8f1768a	North Zone	Elder Appiah	Northern district	Friday 6pm	2026-02-15 09:39:04.078963+00	2026-04-03 10:05:01.140299+00	90b6ddae-6aa3-4645-9b73-c4aaa50b7e28
71e242d4-a4b3-4538-85d8-d5af47b5c7c0	South Zone	Sister Mary	Southern district	Thursday 7pm	2026-02-15 09:40:42.065703+00	2026-04-03 10:05:08.745913+00	ff3d4053-41de-40fe-9746-186ffff357f6
5dc15751-2c93-4673-8a85-00b396e1188d	East Zone	Pastor David	Eastern district outreach	Tuesday 6pm	2026-02-15 09:46:51.914149+00	2026-04-03 15:08:28.031226+00	818c99d2-4334-4704-be01-1d7a3333d7aa
15b30798-4cc9-4679-9d9b-64bf7bf7641b	Adabraka	\N	test zone	Sundays	2026-04-23 07:13:52.127121+00	2026-04-23 07:13:52.127121+00	fe3e9f12-9434-4161-8489-40ef8229e69b
2ff93959-0913-4c5d-a888-d4ee90df96d7	Madina ZOne	\N	testing	Saturdays 2pm	2026-04-26 06:34:06.183884+00	2026-04-26 06:34:06.183884+00	\N
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.migrations_id_seq', 21, true);


--
-- Name: settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.settings_id_seq', 11, true);


--
-- Name: attendance attendance_instance_id_member_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_instance_id_member_id_key UNIQUE (instance_id, member_id);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: event_instances event_instances_event_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_instances
    ADD CONSTRAINT event_instances_event_id_date_key UNIQUE (event_id, date);


--
-- Name: event_instances event_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_instances
    ADD CONSTRAINT event_instances_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: members members_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_email_key UNIQUE (email);


--
-- Name: members members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: settings settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: zones zones_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_name_key UNIQUE (name);


--
-- Name: zones zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_pkey PRIMARY KEY (id);


--
-- Name: idx_attendance_instance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_instance ON public.attendance USING btree (instance_id);


--
-- Name: idx_attendance_member; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_member ON public.attendance USING btree (member_id);


--
-- Name: idx_events_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_active ON public.events USING btree (is_active);


--
-- Name: idx_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_type ON public.events USING btree (type);


--
-- Name: idx_events_zone_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_zone_id ON public.events USING btree (zone_id);


--
-- Name: idx_instances_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_instances_date ON public.event_instances USING btree (date);


--
-- Name: idx_instances_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_instances_event ON public.event_instances USING btree (event_id);


--
-- Name: idx_instances_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_instances_status ON public.event_instances USING btree (status);


--
-- Name: idx_members_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_members_email ON public.members USING btree (email);


--
-- Name: idx_members_marriage_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_members_marriage_date ON public.members USING btree (marriage_date);


--
-- Name: idx_members_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_members_name ON public.members USING btree (last_name, first_name);


--
-- Name: idx_members_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_members_status ON public.members USING btree (status);


--
-- Name: idx_members_zone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_members_zone ON public.members USING btree (zone_id);


--
-- Name: idx_messages_sender_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_sender_user_id ON public.messages USING btree (sender_user_id);


--
-- Name: idx_messages_sender_zone_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_sender_zone_id ON public.messages USING btree (sender_zone_id);


--
-- Name: idx_messages_sent_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_sent_at ON public.messages USING btree (sent_at DESC);


--
-- Name: idx_messages_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_type ON public.messages USING btree (type);


--
-- Name: idx_users_member_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_member_id ON public.users USING btree (member_id);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_zone_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_zone_id ON public.users USING btree (zone_id);


--
-- Name: idx_zones_leader_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zones_leader_id ON public.zones USING btree (leader_id);


--
-- Name: attendance attendance_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES public.event_instances(id) ON DELETE CASCADE;


--
-- Name: attendance attendance_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE SET NULL;


--
-- Name: event_instances event_instances_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_instances
    ADD CONSTRAINT event_instances_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: events events_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE SET NULL;


--
-- Name: messages messages_sender_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: messages messages_sender_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_zone_id_fkey FOREIGN KEY (sender_zone_id) REFERENCES public.zones(id) ON DELETE SET NULL;


--
-- Name: users users_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE SET NULL;


--
-- Name: users users_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE SET NULL;


--
-- Name: zones zones_leader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES public.members(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict fVFlwWTxqR5A1HozqOg9hhq47He4GUqjDcUgFRmhqOLliMyPa0XqZIBOA1fesmc

