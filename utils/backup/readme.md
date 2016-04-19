#Backup for the RichReview Database
RichReview system maintains its data in two different databases:
>- Azure Blob storage stores heavy-loaded PDFs and WAVs.
>- Redis on the virtual machine stores lightweight metadata

###Azure Blob
Go to **utils/backup/** and execute **python run.py** to download the entire Blobs into the **utils/backup/down** folder.

###Redis Database
From the virtual machine, run **SAVE** from **redis-cli**. You will find a backup file using **$>locate *.rdb**. Download the file and store it in a secured place.

Hey! I'm your first Markdown document in **StackEdit**[^stackedit]. Don't delete me, I'm very helpful! I can be recovered anyway in the **Utils** tab of the <i class="icon-cog"></i> **Settings** dialog.