--
-- PostgreSQL database dump
--

\restrict VFc3yBrgD3odb6oj0HwsKBLlPX5YWarkfzaD9ikwtx8kTveaOgkZUb62twTDjUO

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
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid,
    actor_name character varying(255),
    actor_email character varying(255),
    actor_role character varying(50),
    action character varying(50) NOT NULL,
    module character varying(50) NOT NULL,
    record_id character varying(255),
    record_name character varying(255),
    description text NOT NULL,
    changes jsonb DEFAULT '{}'::jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
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
    occupation character varying(500),
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
    other_name character varying(150),
    titles jsonb DEFAULT '[]'::jsonb NOT NULL,
    ex_member_reason text,
    landmark character varying(255),
    whatsapp character varying(15),
    spouse_church character varying(255),
    home_town character varying(255),
    brothers_keeper character varying(255),
    education character varying(255),
    interest character varying(255),
    CONSTRAINT members_gender_check CHECK ((((gender)::text = ANY ((ARRAY['Male'::character varying, 'Female'::character varying, 'Other'::character varying])::text[])) OR (gender IS NULL))),
    CONSTRAINT members_status_check CHECK (((status)::text = ANY ((ARRAY['Active'::character varying, 'Inactive'::character varying, 'Visitor'::character varying, 'Ex-member'::character varying])::text[])))
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
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


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
    role_id uuid,
    mfa_enabled boolean DEFAULT false,
    mfa_code character varying(10),
    mfa_code_expires_at timestamp with time zone,
    temporary_password_hash text,
    temporary_password_expires_at timestamp with time zone,
    password_reset_requested_at timestamp with time zone,
    must_change_password boolean DEFAULT false NOT NULL
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
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


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
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


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
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_actor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_actor_id ON public.audit_logs USING btree (actor_id);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_module ON public.audit_logs USING btree (module);


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
-- Name: idx_users_password_reset_requested_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_password_reset_requested_at ON public.users USING btree (password_reset_requested_at) WHERE (password_reset_requested_at IS NOT NULL);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role_id ON public.users USING btree (role_id);


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
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;


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
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;


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

\unrestrict VFc3yBrgD3odb6oj0HwsKBLlPX5YWarkfzaD9ikwtx8kTveaOgkZUb62twTDjUO
