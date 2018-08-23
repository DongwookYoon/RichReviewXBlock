# UBC Study

These are the (new) redis database models for UBC courses

## User

**User** ( `usr:<userid>` )
userid is a sha1 hash with salt from netid

@type    hash / class
@member nick     {string} - nickname
@member email    {string} required - email of user
@member groupNs  {string|Array<string>} required - array of groupid user is in

@member password_hash {string} - made from irreversible sha1 hash with salt from netid
@member salt       {string}
@member auth_level {string} - is one of "student", "instructor", or "admin"; refers to security level in terms of access to functionality (delete, doc creation, etc); also affects routing.
@member first_name {string} optional - the first name of user
@member last_name  {string} optional - the last name of user
@member sid        {string} optional - the student id of user

userid is also added to email_user_lookup as a hash field

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

**Not sure if useful V V V**

 /**
  * User ( usr:<userid> )
  * userid is a sha1 hash with salt from netid
  *
  * type    hash / class
  *
  * nick     {string} - nickname
  * email    {string} required - email of user
  * groupNs  {string|Array<string>} required - array of groupid user is in
  *
  * userid is also added to email_user_lookup as a hash field
  */

 /**
  * UBCUser ( user:<userid> )
  * userid is a sha1 hash with salt from netid
  *
  * password   {string} - made from irreversible sha1 hash with salt from netid
  * auth_level {string} - is one of "student", "instructor", or "admin"; refers to security level in terms of access to functionality (delete, doc creation, etc); also affects routing.
  *
  * is_active   {string|boolean} - can access ; instructor and admin should ALWAYS be active
  * courses    {string|Array<string>} - an array of strings for courses of form `course:<course-dept>:<course-number>`
  * portfolios {string|Array<string>} - an array of strings for portfolios of form `portfolio:<userid>:<course-dept>:<course-number>`
  *
  * first_name {string} optional - the first name of user
  * last_name  {string} optional - the last name of user
  * sid        {string} optional - the student id of user
  *
  */

 /**
  * Course ( course:<course-dept>:<course-number> )
  *
  * name  {string} - name of the course; defaults to `<course-dept> <course-number>`
  * users {string|Array<string>} - array of usr:[userid] for User (students, instructors and admin)
  */

 /**
  * Portfolio ( portfolio:<userid>:<course-dept>:<course-number> )
  * Search for portfolios belonging to [userid] by `keys portfolio:[userid]:*`
  * Search for portfolios belonging to [course-dept] and [course-number] by `keys portfolio:*:[course-dept]:[course-number]`
  *
  * assignments {string|Array<string>} - array of string `asgmt:<userid>:<course-dept>:<course-number>:<title>`
  *
  * TODO: this may not be necessary
  */

 /**
  * Assignment ( asgmt:<userid>:<course-dept>:<course-number>:<title-slug> )
  * userid      is a sha1 hash with salt from netid
  * title-slug  is the slug of the name of the title
  * Search for assignments belonging to [userid] by `keys asgmt:[userid]:*`
  * Search for assignments belonging to [course-dept] and [course-number] by `keys asgmt:*:[course-dept]:[course-number]:*`
  *
  * type    hash / class
  *
  * member title     {string}required - defaults to `<email-hash>_<timestamp>`
  * member docs      {string|Array<string>} - an array of docid for Doc relating to this assignment
  * member out_of    {number} optional - the amount of marks the assignment is worth
  * member grade     {number} optional - the grade given to student after marking
  * member stat_date {string|Array<string>} required - the date status is updated; statuses and the dates they are instantiated
  * member due_date  {string} optional - is of form ISO 8601 Extended Format and instantiated as new Date().toISOString(); if due_date undefined then no due date.
  * member status   {string} required - is one of "hidden", "active", "blocked", "marked", "submitted"
  *      "hidden"    the student cannot see the assignment
  *      "active"    the student cannot see
  *      "submitted" indicates the student submitted
  *      "marked"    indicates the student
  *      default     the student cannot see the assignment
  */