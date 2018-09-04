# Auth strategies

There are various authentication strategies to log into RichReview:

- UBC_CWL - user logs in through UBC CWL authentication page
    + Registration is automatic: the first time a user logs in using CWL, a new account is created, which the user will use for subsequent logins.
- Internal - user logs in through RichReview directly by entering their username and password. RichReview authenticates the user be validating user's password with stored password (hashed w/ salt).
- Pilot - User logs in through RichReview directly by entering their username and password. Pilot users should be phased out and future developers should use the 'Internal' authentication.
    + The passwords of pilot users are not hashed
    + Users cannot create their own account. This can only be done through a course administrator.
- Google - user logs in through the Google authentication page.
    + Registration is automatic

No two authentication strategies share the same user accounts in RichReview. 

# UBC Study

These are the (new) redis database models for UBC courses

## CWL Account Holder

@typedef {Object} CWLProfile  
@member {string} issuer - should be "https://authentication.ubc.ca"  
@member {string} sessionIndex  
@member {string} nameID  
@member {string} nameIDFormat  
@member {string} nameQualifier  
@member {string} spNameQualifier - should be "https://authentication.ubc.ca"  
@member {string} sessionIndex - should be sp_***_ubc  
@member {string} urn:oid:1.3.6.1.4.1.60.1.7.1  
@member {string} urn:oid:0.9.2342.19200300.100.1.1 - the CWL login name  
@member {string} urn:oid:0.9.2342.19200300.100.1.3  
@member {string} urn:oid:2.5.4.42  
@member {string} urn:mace:dir:attribute-def:ubcEduStudentNumber  
@member {string} urn:oid:2.5.4.4  
@member {string} urn:oid:2.16.840.1.113719.1.1.4.1.25 - the group attributes  
@member {string} mail  
@member {string} email  

## User ID and email referencing

We use a Bipartite graph called the `userid_email_table` to lookup between emails and user IDs. The same email can be associated with multiple separate user IDs. It is a priority to select IDs from UBC CWL.

To set up the `userid_email_table` we use the script in `./data/make_userid_email_table.js`

Previously we used a table named `user_email_lookup` which forces RichReview to use a unique ID for each email. This is deprecated.

#### User in Redis

User (`usr:<userid>`) is a hash.
userid is the generated differently and can be dependent on the authentication type. Cornell first-time authentication will hash the user using using crypto. Google accounts use the profile ID provided by the Google+ omnibus account. UBC 
 CWL accounts use the eduPersistantID provided by IAM. See [auth strategies](#auth-strategies) for more details. The keys in the redis hash are identical to those in User (square-bracketed variables are optional): 

nick, email, groupNs, [auth_type], [password_hash], [salt], [is_admin], [auth_level], [display_name], [first_name], [last_name], [sid].

See [User in NodeJS](#User-in-NodeJS) for more details.

#### User in NodeJS

`User` is an object stored in `R2D.User.cache`
@class User
@member {string} id               - the ID of the user in RichReview
@member {string} nick             - nickname
@member {string} email            - email of user
@member {string|string[]} groupNs - array of groupid user is in
@member {string} [auth_type]      - is one of "UBC_CWL", "Pilot", "Cornell", or "Google" representing the auth strategy and user affiliation. Please update when there is a new auth strategy
@member {string} [password_hash]  - made from irreversible sha1 hash with salt from netid
@member {string} [salt]           -
@member {boolean} [is_admin]      - is user admin; used for superuser actions
@member {string} [auth_level]     - Deprecated. Is one of "student", "instructor", or "admin"; refers to security level in terms of access to functionality (delete, doc creation, etc); also affects routing.
@member {string} [display_name]   - the preferred name of the user
@member {string} [first_name]     - the first name of user
@member {string} [last_name]      - the last name of user
@member {string} [sid]            - the student id of user

## Course


#### Course in Redis

Course (`crs:<institution>:<course-group>:prop`) is a hash with keys:
course_group, is_active, institution, [dept], [number], [section], [year], [title]

Active students can view the class and assignments. Blocked students cannot view anything.

course instructors (`crs:<institution>:<course-group>:instructors`) is a set containing strings that are user IDs of instructors.

course active students (`crs:<institution>:<course-group>:students:active`) is a set containing the user IDs of active students of course.

course blocked students (`crs:<institution>:<course-group>:students:blocked`) is a set containing the user IDs of blocked students of course.

#### Course in NodeJS

@class Course  
@member {string} course_group - the unique ID that identifies the course; this ID can be forwarded by ELDAP to CWL user profile in CWL auth callback.  
@member {boolean} is_active   - true if the course is active (i.e. is showable in the front-end view); false otherwise.  
@member {string} institution  - the course institution (i.e. ubc)  
@member {string} [dept]       - the course department (i.e. cpsc)  
@member {string} [number]     - the course number  (i.e. 210)  
@member {string} [section]    - the course section (i.e. 001)  
@member {string} [year]       - the year the course is held (i.e. 2018W)  
@member {string} [title]      - the course title   (i.e. Software Construction)  
@member {User[]} instructors  - a list of instuctors  
@member {User[]} active_students  - a list of active students   
@member {User[]} blocked_students - a list of blocked students  

NOTE: course_group, institution, dept, number, section, year should be made lower case but search of the query of these variables should be case insensitive

## Assignment

**Assignment** ( `asgmt:<userid>:<course-dept>:<course-number>:<title-slug>` )
userid      is a sha1 hash with salt from netid
title-slug  is the slug of the name of the title
Search for assignments belonging to [userid] by `keys asgmt:[userid]:*`
Search for assignments belonging to [course-dept] and [course-number] by `keys asgmt:*:[course-dept]:[course-number]:*`

**assignment data** ( `asgmt:<userid>:<course-dept>:<course-number>:<title-slug>:prop` )
@type    hash / class
@member title     {string}required - defaults to `<email-hash>_<timestamp>`
@member group     {string|Array<string>} - an array of groupid for Group relating to this assignment
@member out_of    {number} optional - the amount of marks the assignment is worth
@member grade     {number} optional - the grade given to student after marking
@member stat_date {string|Array<string>} required - the date status is updated; statuses and the dates they are instantiated
@member due_date  {string} optional - is of form ISO 8601 Extended Format and instantiated as new Date().toISOString(); if due_date undefined then no due date.
@member status   {string} required - is one of
 -   "hidden"    the student cannot see the assignment
 -   "active"    indicates student can do+handin the assignment
 -   "submitted" indicates the student submitted
 -   "marked"    indicates assignment is marked
 -   default     (error) the student cannot see the assignment

**assignment groups** ( `asgmt:<userid>:<course-dept>:<course-number>:<title-slug>:groups` ) a set containing all the groupid of the groups associated with this assignment