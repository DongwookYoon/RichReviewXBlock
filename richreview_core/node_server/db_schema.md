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

Previously we used a table named `user_email_lookup` which forces RichReview to use a unique ID for each email.

**User** ( `usr:<userid>` )
userid is a sha1 hash with salt from netid

@type    hash / class
@member {string} nick             - nickname
@member {string} email            - email of user
@member {string|string[]} groupNs - array of groupid user is in

@member {string} [auth_type]      - is one of "UBC_CWL", "Pilot", "Cornell", or "Google" representing the auth strategy and user affiliation. Please update when there is a new auth strategy
@member {string} [password_hash]  - made from irreversible sha1 hash with salt from netid
@member {string} [salt]           -
@member {boolean} [is_admin]      - is user admin; used for superuser actions
@member {string} [auth_level]     - Deprecated. Is one of "student", "instructor", or "admin"; refers to security level in terms of access to functionality (delete, doc creation, etc); also affects routing.

@member {string} [first_name]     - the first name of user
@member {string} [last_name]      - the last name of user
@member {string} [sid]            - the student id of user

## Course

**Course** ( `course:<course-dept>:<course-number>` )

**course properties** ( `course:<course-dept>:<course-number>:prop` )
@type hash / class
@member course_is_active {boolean} - true if course is active, false otherwise
@member name  {string} - name of the course; defaults to `<course-dept> <course-number>`

## Course users

**course instructor** ( `course:<course-dept>:<course-number>:instructors` ) is of type set containing the userid of instructors of course

**course active students** ( `course:<course-dept>:<course-number>:students:active` ) is of type set containing the userid of active students of course

**course blocked students** ( `course:<course-dept>:<course-number>:students:blocked` ) is of type set containing the userid of blocked students of course

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