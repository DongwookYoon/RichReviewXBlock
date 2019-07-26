const ldap = require('ldapjs');
const schedule = require('node-schedule');
const fs = require('fs');
const path = require('path');
const KeyDictionary = require('../bin/KeyDictionary');
const ImportHandler = require('../bin/ImportHandler');

const UID_LENGTH = 4;

const eldap_config = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'ssl', 'eldap_config.json'), 'utf-8')
);

const client = ldap.createClient({
    url: eldap_config.url,
    tlsOptions: { rejectUnauthorized: false }
});

client.bind(eldap_config.user, eldap_config.password, function(err) {
    console.log(err)
});

const j = schedule.scheduleJob('0 0 * * *', async function (fireDate) {
    console.log('This job was supposed to run at ' + fireDate + ', but actually ran at ' + new Date());

    let all_courses = await get_all_courses();

    for (let course of all_courses) {
        await verify_enrolments(course);
    }
});




async function verify_enrolments(course) {
    let course_key = get_course_key(course);

    if(!(await does_course_exist(course_key))) {
        await create_course(course_key, course);
    }

    let instructor_course = is_instructor_course(course);

    if (instructor_course)
        await verify_instructor_course(course_key, course.uniqueMember);
    else
        await verify_student_course(course_key, course.uniqueMember);
}




async function verify_instructor_course(course_key, members) {
    if (typeof members === "string") {
        let user_key = get_user_key(members);

        if(!(await does_user_exist(user_key)))
            await create_user(user_key);

        let is_user_enrolled = await is_user_instructor_for_course(user_key, course_key);
        if(!is_user_enrolled)
            await add_instructor_to_course(user_key, course_key);
    }

    for (let member of members) {
        if (member.length > 1) {
            let user_key = get_user_key(member);

            if (!(await does_user_exist(user_key)))
                await create_user(user_key);

            let is_user_enrolled = await is_user_instructor_for_course(user_key, course_key);
            if (!is_user_enrolled)
                await add_instructor_to_course(user_key, course_key);
        }
    }
}

async function verify_student_course(course_key, members) {
    if (typeof members === "string") {
        let user_key = get_user_key(members);

        if(!(await does_user_exist(user_key)))
            await create_user(user_key);

        let is_user_enrolled = await is_user_enrolled_in_course(user_key, course_key);
        if(!is_user_enrolled)
            await add_student_to_course(user_key, course_key);
    }

    for (let member of members) {
        if (member.length > 1) {
            let user_key = get_user_key(member);

            if (!(await does_user_exist(user_key)))
                await create_user(user_key);

            let is_user_enrolled = await is_user_enrolled_in_course(user_key, course_key);
            if (!is_user_enrolled)
                await add_student_to_course(user_key, course_key);
        }
    }
}




async function add_student_to_course(user_key, course_key) {
    let course_db_handler = await ImportHandler.course_db_handler;
    await course_db_handler.add_student_to_course(ImportHandler, user_key, course_key);
}

async function add_instructor_to_course(user_key, course_key) {
    let course_db_handler = await ImportHandler.course_db_handler;
    await course_db_handler.add_instructor_to_course(ImportHandler, user_key, course_key);
}




async function is_user_enrolled_in_course(user_key, course_key) {
    let course_db_handler = await ImportHandler.course_db_handler;
    return await course_db_handler.is_user_enrolled_in_course(user_key, course_key);
}

async function is_user_instructor_for_course(user_key, course_key) {
    let course_db_handler = await ImportHandler.course_db_handler;
    return await course_db_handler.is_user_instructor_for_course(user_key, course_key);
}





async function does_course_exist(course_key) {
    let course_db_handler = await ImportHandler.course_db_handler;
    return await course_db_handler.is_valid_course_key(course_key);
}

async function does_user_exist(user_key) {
    let user_db_handler = await ImportHandler.user_db_handler;
    return await user_db_handler.is_valid_user_key(user_key);
}





function get_user_key(user) {
    let comma_index = user.indexOf(',');
    return KeyDictionary.key_dictionary['user'] + user.substring(UID_LENGTH, comma_index)
}

function get_course_key(course) {
    if (is_instructor_course(course))
        return KeyDictionary.key_dictionary['course'] + course.cn.replace('_instructor', '');

    return KeyDictionary.key_dictionary['course'] + course.cn;
}

function is_instructor_course(course) {
    return course.cn.includes('_instructor');
}




async function create_course(course_key, course) {
    let course_db_handler = await ImportHandler.course_db_handler;

    let course_data = get_course_details(course);
    await course_db_handler.create_course(course_key, course_data);
}

async function create_user(user_key) {
    let user_db_handler = await ImportHandler.user_db_handler;

    let user_data = {
        id: user_key.replace(KeyDictionary.key_dictionary['user'], ''),
        creation_date: Date.now(),
        auth_type: 'UBC'
    };
    await user_db_handler.create_user(user_key, user_data);
}



function get_course_details(course) {
    let course_string = course.cn.replace('_instructor', '');
    let details = course_string.split('_');

    return {
        id: course_string,
        title: `${details[0]} ${details[1]} ${details[2]}`,
        dept: details[0],
        number: details[1],
        section: details[2],
        year: details[3],
        institution: 'UBC'
    }
}




function get_all_courses () {
    return new Promise((resolve, reject) => {
        const opts = {
            scope: 'sub'
        };

        client.search(eldap_config.dn, opts, function(err, res) {

            let entries = [];
            res.on('searchEntry', function(entry) {
                // console.log('entry: ' + JSON.stringify(entry.object));
                entries.push(entry.object);
            });
            res.on('searchReference', function(referral) {
                console.log('referral: ' + referral.uris.join());
                reject('Got a search reference referral');
            });
            res.on('error', function(err) {
                console.error('error: ' + err.message);
                reject(err);
            });
            res.on('end', function(result) {
                console.log('status: ' + result.status);
                entries = entries.filter(entry => {
                    return entry.dn !== eldap_config.dn &&
                        !entry.dn.includes('cn=admins')
                });
                resolve(entries);
            });
        });
    })
}