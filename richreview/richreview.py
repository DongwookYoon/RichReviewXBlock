"""This XBlock manages backend data flow of the RichReview web app."""
import traceback
import hashlib
import json
from uuid import uuid4

from xblock.core import XBlock
from xblock.fields import Scope, String, Dict, List, RemoteScope
from xblock.fragment import Fragment
from djpyfs import djpyfs
from django.conf import settings
from webob.response import Response
from boto.s3.connection import Location
from pys3website import pys3website

from util import *
from osfs_utils import upload_webapp, clear_webapp, osfs_mkdir, osfs_copy_file, osfs_save_formfile
from mupla_ctype import mupla_ctype

RESOURCE_EXPIRATION_TIME = 7200 # 2 hours

class RichReviewXBlock(XBlock):
    """
    This XBlock
        (1) serves the RichReview web app at '../webapps/app_richreview', and
        (2) manages backend data flow of the app.
    """

    # This filesystem stores the document (.PDF), the document metadata (.js), and audio (.WAV) files.
    # The audio files will be stored at '<xblockid>/<groupid>/'.
    # The document files will be stored at '<xblockid>/<docs>/'.
    # Note that the PDF file will be renamed to the file contents' SHA1 hash value
    #   (e.g., '6adfb183a4a2c94a2f92dab5ade762a47889a5a1.pdf').
    fs = djpyfs.get_filesystem("rrfs")
    # The RichReview web app will be served via this static URL.
    # The web app files are stored in '/static/app', and will be maintained or updated through a github repository.
    if hasattr(settings, 'DJFS'):
        djfs_settings = settings.DJFS
    else:
        djfs_settings = {'type' : 'osfs',
                         'directory_root' : 'common/static/djpyfs',
                         'url_root' : '/static/djpyfs'}
    if djfs_settings["type"] == "osfs":
        clear_webapp(fs, 'richreview_web_app')
        richreview_app_url =  upload_webapp(fs, "/webapps/richreview", "richreview_web_app", exclude=r'^\.')

        clear_webapp(fs, 'multicolumn_web_app')
        multicolumn_app_url =  upload_webapp(fs, "/webapps/multicolumn", "multicolumn_web_app", exclude=r'^\.')

    elif djfs_settings["type"] == "s3fs":
        s3website = pys3website.s3website(
            bucket_name = settings.DJFS['bucket'],
            location = Location.DEFAULT,
            index_page = "index.html",
            err_page = "error.html",
            key_id = djfs_settings["aws_access_key_id"],
            secret_key = djfs_settings["aws_secret_access_key"]
        )

        dir = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))

        s3website.clear("richreview_web_app")
        s3website.update(
            local_path = dir + "/richreview/webapps/richreview",
            prefix = "richreview_web_app"
        )

        s3website.clear("multicolumn_web_app")
        s3website.update(
            local_path = dir + "/richreview/webapps/multicolumn",
            prefix = "multicolumn_web_app"
        )

        richreview_app_url =  s3website.get_url("richreview_web_app")
        multicolumn_app_url =  s3website.get_url("multicolumn_web_app")

    # SHA1 hash of the PDF file under discussion.
    # This value will be updated when a new file is uploaded from the Studio view.
    discussion_docid = String(
        help = "Id of the pdf under discussion",
        default = "",
        scope=Scope.settings
    )

    # This dictionary stores the list of student's anonymous ids for a given group.
    # Usage: students_of_group[<groupid>] == [<student id 0>, <student id 1>, ...]
    #        Use self.assign_group() to update
    students_of_group = Dict(
        help = "groupid of this specific student",
        default={},
        scope=Scope.user_state_summary
    )

    # This dictionary maps each student to a group in parallel with students_of_group
    # Usage: Use self.assign_group() to update
    group_of_student = Dict(
        help = "list of students in each group",
        default={},
        scope=Scope.user_state_summary
    )

    # This dictionary maps each groups to the id of the document (.PDF) that they are supposed to discuss
    # Usage: pdf_of_group[<groupid>] == <pdfid>
    doc_of_group = Dict(
        help = "Id of the pdf assigned to each group",
        default={},
        scope=Scope.user_state_summary
    )

    #This dictionary stores the list of comments & commands for each group
    # Usage: cmds_of_group[<groupid>] == [<cmd0>, <cmd1>, ... ]
    cmds_of_group = List(
        help = "list of annotation data (JSON format) in a chronological order",
        default=[],
        scope=Scope.user_state,
        remote_scope=RemoteScope.course_users
    )

    shared_cmds_of_group = List.Query(
        field_name='cmds_of_group'
    )




    @property
    def course_id(self):
        try:
            return str(self.runtime.course_id)
        except:
            return 'testcourseid000'

    @property
    def xblock_id(self):
        """
        ID of this xblock is useful for defining file storage path. For example,
        if 'the Textbook's Chapter 12' is the discussion topic, all the commentary data will be
         stored in the form of <course_id>/<** xblock_id **>/<groupid>/<someid>.wav
        """
        return self.scope_ids.usage_id.block_id

    @property
    def anonymous_student_id(self):
        try:
            return self.runtime.anonymous_student_id
        except:
            return 'anonymouseuserid0000'

    @property
    def user_is_staff(self):
        """
        Staffs will intervene into the on-going discussion using their XBlock's ** live view **.
         We will identify them with this flag. Note that all the commenting--including staffs'--
         will be done in the student view, not studio view.
        """
        try:
            return self.runtime.user_is_staff
        except:
            return False

    @property
    def group_id(self):
        """
        Get current user's group_id
        """
        if not self.anonymous_student_id in self.group_of_student:
            self.assign_group()
        return self.group_of_student[self.anonymous_student_id]

    @property
    def xblock_path(self):
        return self.course_id + "/" + self.xblock_id

    @property
    def pdf_path(self):
        """
        Path where the PDF file will be stored.
        """
        return "doc/" + self.discussion_docid + ".pdf"

    @property
    def pdfjs_path(self):
        """
        Path where the PDF's layout data file (in Json) will be stored.
        """
        return "doc/" + self.discussion_docid + ".js"

    @property
    def is_pdf_ready(self):
        """
        self.discussion_docid is set to SHA1 of the PDF file ** after ** the staff upload the file.
        """
        return self.discussion_docid != "" and self.fs.exists(self.pdf_path) and self.fs.exists(self.pdfjs_path)

    def get_audio_filepath(self, groupid, audio_filename):
        return self.xblock_path + "/" + groupid + "/" + audio_filename + ".wav"

    def get_available_group(self):
        """
        Returns any available group that have less than 5 members. If all groups are full, then
        create a group and returns.
        """
        for groupid in self.students_of_group:
            if len(self.students_of_group[groupid]) < 5: #hardcoded maximum number of users in a group
                return groupid
        new_groupid = uuid4().hex
        self.students_of_group[new_groupid] = []
        self.doc_of_group[new_groupid] = self.discussion_docid
        return new_groupid

    def assign_group(self):
        """
        Add this student to an any available group. If the group is not exist, create it, and add the student.
        """
        groupid = self.get_available_group()
        self.students_of_group[groupid].append(self.anonymous_student_id)
        self.group_of_student[self.anonymous_student_id] = groupid

    def get_richreview_user(self, anonymous_student_id):
        """
        Returns a json representation of RichReview user profile
        """
        try:
            real_user = self.runtime.get_real_user(anonymous_student_id)
            return {
                "id": anonymous_student_id,
                "nick": real_user.username,
                "email": real_user.email
            }
        except:
            return {
                "id": anonymous_student_id,
                "nick": "Student Name",
                "email": "student.mail@example.com"
            }

    def init_cmds(self, groupid):
        """
        Creat a new cmd slot for the group, if it is not there.
        """
        if not groupid in self.cmds_of_group:
            self.cmds_of_group[groupid] = []

    def add_cmd(self, cmd, groupid):
        # self.init_cmds(groupid)
        # self.cmds_of_group[groupid].append(json.loads(cmd))
        group_cmds = self.shared_cmds_of_group.get(user_id=groupid)
        group_cmds.append(json.loads(cmd))
        self.shared_cmds_of_group.set(value=group_cmds, user_id=groupid)

    def get_cmds(self, groupid, cmds_downloaded_n):
        """
        Get new cmds that has been updated after the last download.
        """
        # self.init_cmds(groupid)
        # cmds = self.cmds_of_group[groupid][int(cmds_downloaded_n):]

        group_cmds = self.shared_cmds_of_group.get(user_id=groupid)
        cmds = group_cmds[int(cmds_downloaded_n):]
        
        for idx, cmd in enumerate(cmds):
            if cmd["op"] == "CreateComment" and cmd["type"] == "CommentAudio":
                cmds[idx]["data"]["audiofileurl"] = self.fs.get_url(
                    self.get_audio_filepath(groupid, cmd["user"] + "_"+cmd["data"]["aid"]),
                    RESOURCE_EXPIRATION_TIME
                )
        cmd_str = []
        for cmd in cmds:
            cmd_str.append(json.dumps(cmd))
        return cmd_str

    def student_view(self, context=None):
        """
        The primary view of the RichReviewXBlock, shown to students
        when viewing courses.
        """
        frag = Fragment()
        frag.add_css(load_resource("static/css/richreview.css"))
        frag.add_javascript(load_resource("static/js/src/richreview_student.js"))

        frag.add_javascript_url(self.runtime.local_resource_url(self, "public/pdf.js"))
        frag.add_content(render_template(
                "templates/richreview_student.html",
                {
                    'xblock_id': self.xblock_id,
                    'student_id': self.anonymous_student_id,
                    'user_is_staff': str(self.user_is_staff),
                    'students_of_group': str(self.students_of_group),
                    'group_of_student': str(self.group_of_student),
                    'discussion_docid': self.discussion_docid,

                    'is_pdf_ready': self.is_pdf_ready
                }
            ))

        frag.initialize_js('RichReviewXBlock')
        return frag

    def studio_view(self, context=None):
        """
        The staff's view of RichReviewXBlock. Staffs can upload discussion topic PDF or view the students'
        discussion activities
        """
        frag = Fragment()
        frag.add_css(load_resource("static/css/richreview.css"))
        frag.add_javascript(load_resource("static/js/src/richreview_studio.js"))
        frag.add_content(render_template(
                "templates/richreview_studio.html",
                {
                    'xblock_id': self.xblock_id,
                    'student_id': self.anonymous_student_id,
                    'user_is_staff': str(self.user_is_staff),
                    'students_of_group': str(self.students_of_group),
                    'group_of_student': str(self.group_of_student),
                    'discussion_docid': self.discussion_docid,

                    'is_pdf_ready': self.is_pdf_ready,
                    'is_debug': True,
                    'pdf_url': self.fs.get_url(self.pdf_path, RESOURCE_EXPIRATION_TIME),
                    'pdfjs_url': self.fs.get_url(self.pdfjs_path, RESOURCE_EXPIRATION_TIME),
                }
            ))
        frag.initialize_js('RichReviewXBlockStudio', "abcd")
        return frag

    def get_mupla(self):
        tmp_path = "/tmp/" + uuid4().hex + ".pdf"
        with self.fs.open(self.pdf_path, "rb") as src:
            with open(tmp_path, "wb") as dst:
                dst.write(src.read())
                dst.close()
                js = mupla_ctype.PyMuPlaRun(tmp_path)
            src.close()
        return js

    @XBlock.handler
    def pdfupload(self, request, suffix=''):
        """
        Handles PDF upload request from the studio
        """
        try:
            temp_path = self.xblock_path + "/_temp.file"
            osfs_save_formfile(self.fs, temp_path, request.POST['pdffile'].file)
            with self.fs.open(temp_path, "rb") as f:
                h = hashlib.sha1()
                h.update(f.read())
                self.discussion_docid = h.hexdigest()
                osfs_copy_file(self.fs, temp_path, self.pdf_path)

                mupla_pdfs_folder_path = self.xblock_path + "/" + self.discussion_docid
                mupla_pdf_path = mupla_pdfs_folder_path + "/merged.pdf"
                osfs_mkdir(self.fs, mupla_pdf_path)
                osfs_copy_file(self.fs, self.pdf_path, mupla_pdf_path)

                with self.fs.open(mupla_pdfs_folder_path + "/merged.js", "wb") as f_js:
                    json.dump(self.get_mupla(), f_js)
                    f_js.close()

            return Response(json_body={
                "pdf_url": self.fs.get_url(mupla_pdfs_folder_path+"/merged.pdf", RESOURCE_EXPIRATION_TIME),
                "js_url": self.fs.get_url(mupla_pdfs_folder_path+"/merged.js", RESOURCE_EXPIRATION_TIME),
                "multicolumn_webapp_url": self.multicolumn_app_url,
            })
        except Exception:
            print(traceback.format_exc())
            return Response(status=406)

    @XBlock.json_handler
    def pdfjsupload(self, data, suffix=""):
        """
        Receives the analyzed layout data from the MultiColumn analysis engine.
        """
        with self.fs.open(self.pdfjs_path, "wb") as f:
            json.dump(data, f)
            f.close()
        return {"response": 'ok'}


    @XBlock.json_handler
    def pdfdelete(self, request, suffix=''):
        """
        Handles PDF delete request from the studio
        """
        if self.fs.exists(self.pdf_path):
            self.fs.remove(self.pdf_path)
        if self.fs.exists(self.pdfjs_path):
            self.fs.remove(self.pdfjs_path)
        self.discussion_docid = ""
        return {"response": 'ok'}

    @XBlock.json_handler
    def get_richreview_context(self, req, suffix=''):
        """
        Serves RichReview web app contexts
        """
        return {
            "pdfid": self.discussion_docid,
            "docid": self.xblock_id,
            "groupid": self.group_id,
            "app_url":self.richreview_app_url,
            "pdf_url": self.fs.get_url(self.pdf_path, RESOURCE_EXPIRATION_TIME),
            "pdfjs_url": self.fs.get_url(self.pdfjs_path, RESOURCE_EXPIRATION_TIME)
        }

    @XBlock.handler
    def serve_dbs(self, req, suffix=''):
        """
        Simple switch for the database service
        """
        return self.serve_dbs_map[req.GET["op"]](self, req.POST)

    @XBlock.handler
    def upload_audio(self, request, suffix=''):
        """
        Get audio file from the web app and stores it in the file system.
        POST['data'] is base64 encoded .WAV file stream. POST['fname'] is the filename in the form of <student_id>_<comment_id>.
        For example, 'b7fa14f2df91760225ec682fea1f9da9_2015-06-11T14:21:30.617Z'. Note that the <comment_id> is the time that
        the annotation was created.
        """
        datastr = request.POST['data']
        audio_data = datastr[datastr.index(',')+1:]

        audio_filepath = self.get_audio_filepath(self.group_id, request.POST['fname'])
        osfs_mkdir(self.fs, audio_filepath)

        with self.fs.open(audio_filepath, "wb") as f:
            f.write(audio_data.decode('base64'))
            f.close()
        return Response()

    def get_users_data(self, groupid):

        js = {}
        js["self"] = self.get_cur_user_json()
        js["users"] = self.get_group_users_json(groupid)
        return js

    def serve_dbs_user_data(self, post):
        """
        Serves user data. Note that js["self"] is always this user.
        js["self"] may not be in js["users"], but then the web app runs in an observer mode.
        """
        groupid = post["groupid"][4:]
        return Response(json_body=self.get_users_data(groupid))

    def serve_dbs_doc_groups(self, post):
        """
        Serves a list of all the groups in this xblock.
        """
        js = {
            "creationTime":"0",
            "name":"RichReview Discussion Group",
            "userid_n":"staff",
            "pdfid": self.discussion_docid,
            "groups":map(lambda x : 'grp:' + x, self.students_of_group.keys()),
            "id":"doc:"+self.xblock_id,
            "creationTimeStr":"Sat, 01/01/2000 00:00 AM"}
        return Response(json_body = js)

    def serve_dbs_log(self, post):
        """
        Logs user activity
        """
        js = {}
        return Response(json_body = js)

    def serve_dbs_download_cmds(self, post):
        """
        Serves updated cmds of this group
        """
        users = self.get_group_users_json(post["groupid_n"])
        update_user = int(post["cur_members_n"]) != len(users)
        js = {
            "cmds": self.get_cmds(post["groupid_n"], post["cmds_downloaded_n"]),
            "users": self.get_users_data(post["groupid_n"]) if update_user else "",
        }
        return Response(json_body = js)

    def serve_dbs_upload_cmd(self, post):
        """
        Uploads a new discussion to this group's data
        """
        self.add_cmd(post["cmd"], post["groupid_n"])
        return Response()

    def get_cur_user_json(self):
        return self.get_richreview_user(self.anonymous_student_id)

    def get_group_users_json(self, groupid):
        """
        Get list of users (in a RichReview's json form) for a given group
        """
        group_users = []
        if groupid in self.students_of_group:
            for userid in self.students_of_group[groupid]:
                group_users.append(self.get_richreview_user(userid))
        return group_users

    # switch for a database service
    serve_dbs_map = {
        "GetUserData": serve_dbs_user_data,
        "GetDocGroups": serve_dbs_doc_groups,
        "WebAppLog": serve_dbs_log,
        "DownloadCmds": serve_dbs_download_cmds,
        "UploadCmd": serve_dbs_upload_cmd,
    }


    # workbench scenario
    @staticmethod
    def workbench_scenarios():
        """A canned scenario for display in the workbench."""
        return [
            ("RichReviewXBlock",
             """
                <richreview/>
             """),
        ]

