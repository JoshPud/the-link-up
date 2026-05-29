# The Board — Setup Guide
### Written for beginners. Every term explained.

---

## What you'll end up with

A real webpage at a URL like `https://the-board.vercel.app` that you and your team
can all visit. Links added by one person instantly appear for everyone else.
YouTube thumbnails load properly. No Claude sandbox restrictions.

---

## The tools you're using (and what they actually are)

- **GitHub** — a website where developers store code. Think of it like Google Drive
  but specifically for code files. You already have an account.

- **Vercel** — a free service that takes your code from GitHub and turns it into a
  live website automatically. Every time you update the code, the website updates too.

- **Supabase** — a free online database. A database is like a shared spreadsheet in
  the cloud — it's where your links get stored so everyone sees the same board.
  Supabase is free for small projects like this.

- **Node.js** — a program you install on your computer that lets you run JavaScript
  outside of a browser. You need it to "build" the project (turn the code into a
  website). Think of it like a translator.

- **npm** — automatically installed alongside Node.js. It's a tool that downloads
  the code libraries your project depends on (like a package manager — similar to
  the App Store but for code components).

- **Terminal** — the plain text window on your computer where you type commands.
  On Mac it's called Terminal (find it in Applications → Utilities).
  On Windows it's called Command Prompt or PowerShell.

---

## Step 1 — Install Node.js on your computer

Node.js is a free program. You only need to do this once.

1. Go to **https://nodejs.org**
2. Click the big green button that says **"LTS"** (this means the stable version)
3. Download and install it like any other program — just keep clicking Next/Continue
4. To check it worked: open Terminal and type `node --version` then press Enter.
   You should see something like `v20.11.0`. If you do, you're good.

---

## Step 2 — Set up Supabase (your database)

Supabase is where the links get stored. It's free.

1. Go to **https://supabase.com** and click **Start your project**
2. Sign up with your GitHub account (easiest option)
3. Click **New project**
   - Give it a name like `the-board`
   - Choose any region (pick one near you)
   - Set a database password — make it something you can remember, save it somewhere
   - Click **Create new project** and wait about a minute for it to set up
4. Once it's ready, click **SQL Editor** in the left sidebar
5. You'll see a text box. Paste this exactly into it and click **Run**:

```sql
create table links (
  id uuid default gen_random_uuid() primary key,
  url text not null,
  title text,
  description text,
  image text,
  created_at timestamptz default now()
);

alter table links enable row level security;

create policy "Anyone can read links" on links for select using (true);
create policy "Anyone can insert links" on links for insert with check (true);
create policy "Anyone can delete links" on links for delete using (true);
```

   This creates the "links" table (like a spreadsheet tab) in your database,
   and sets the rules so anyone with the URL can add/remove links.

6. Now get your secret keys:
   - Click **Project Settings** in the left sidebar (the cog icon at the bottom)
   - Click **API**
   - You'll see two things you need to copy:
     - **Project URL** — looks like `https://abcdefgh.supabase.co`
     - **anon public** key — a very long string of letters and numbers
   - Keep this tab open, you'll need these in a moment

---

## Step 3 — Put the project files on your computer

The project files I've prepared need to go into a folder on your computer.

1. Download the zip file I've prepared (the files attached to this guide)
2. Unzip it — you'll get a folder called `theboard`
3. Open Terminal and navigate into that folder:
   - On Mac, type `cd ` (with a space after), then drag the `theboard` folder
     directly into the Terminal window — it'll type the path for you. Press Enter.
   - On Windows, right-click the `theboard` folder and choose
     "Open in Terminal" or "Open PowerShell window here"

4. Now open the file called `.env.local` in a text editor (Notepad on Windows,
   TextEdit on Mac, or any code editor). Replace the placeholder text with your
   actual Supabase values from Step 2:

```
VITE_SUPABASE_URL=https://your-actual-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-long-key-here
```

   Save the file.

5. Back in Terminal, type this and press Enter:
```
npm install
```
   This downloads all the code libraries the project needs. You'll see a lot of
   text scroll past — that's normal. Wait for it to finish (about 30 seconds).

6. Test it works locally by typing:
```
npm run dev
```
   Open your browser and go to **http://localhost:5173** — you should see The Board.
   If it works, great! Press Ctrl+C in Terminal to stop it.

---

## Step 4 — Push the code to GitHub

GitHub is where Vercel will read your code from.

1. Go to **https://github.com** and log in
2. Click the **+** button in the top right → **New repository**
3. Name it `the-board` (or anything you like)
4. Leave everything else as default and click **Create repository**
5. GitHub will show you a page with some commands. Copy the URL of your new
   repo — it looks like `https://github.com/yourusername/the-board.git`

6. Back in Terminal (make sure you're still in the `theboard` folder), type
   these commands one at a time, pressing Enter after each:

```
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/yourusername/the-board.git
git push -u origin main
```

   Replace `yourusername/the-board` with your actual GitHub username and repo name.
   It may ask for your GitHub password — use a Personal Access Token if so
   (GitHub → Settings → Developer Settings → Personal Access Tokens → Generate new).

---

## Step 5 — Deploy to Vercel

Vercel turns your GitHub code into a live website. Free, takes 2 minutes.

1. Go to **https://vercel.com** and click **Sign Up**
2. Choose **Continue with GitHub** — this links Vercel to your GitHub account
3. Click **Add New Project**
4. You'll see a list of your GitHub repositories — click **Import** next to `the-board`
5. Vercel will auto-detect it's a Vite/React project. Don't change any settings.
6. Before clicking Deploy, you need to add your secret Supabase keys:
   - Scroll down to **Environment Variables**
   - Add the first one:
     - Name: `VITE_SUPABASE_URL`
     - Value: your Supabase Project URL
   - Add the second one:
     - Name: `VITE_SUPABASE_ANON_KEY`
     - Value: your Supabase anon key
7. Click **Deploy**

Vercel will build and deploy your site — takes about a minute.
When it's done you'll see a URL like `https://the-board-abc123.vercel.app`.
That's your live site. Share it with your team.

---

## Step 6 — Share it

Send the Vercel URL to your team. That's it. Anyone with the link can add
and remove links from the board. No login required.

---

## If something goes wrong

- **"npm: command not found"** — Node.js didn't install properly. Try reinstalling from nodejs.org.
- **Board loads but links don't save** — your Supabase keys in `.env.local` might have
  a typo. Double-check them.
- **Vercel deploy fails** — make sure you added both environment variables in Step 5.
- **Images still don't show for some links** — Instagram/Twitter will never auto-load.
  YouTube should work fine. For others, paste the image URL manually.

---

## Keeping it updated

If you ever want to make changes to the app, edit the files, then run:
```
git add .
git commit -m "describe what you changed"
git push
```
Vercel will automatically detect the change and redeploy the site within a minute.
