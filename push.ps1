$git = "E:\Git\bin\git.exe"
& $git config --global user.name "PrintQueue User"
& $git config --global user.email "user@printqueue.local"
& $git init
& $git add .
& $git commit -m "Initial commit for PrintQueue Pro"
& $git branch -M main
& $git remote add origin https://github.com/ompop-pro21/printing-c2c.git
& $git push -u origin main
