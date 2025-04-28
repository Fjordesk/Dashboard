package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"strings"
)

type ServiceDetail struct {
	Type    string `json:"type"`
	Remarks string `json:"remarks"`
}

type Task struct {
	ID          string `json:"id"`
	Description string `json:"description"`
	DueDate     string `json:"dueDate"`
	Status      string `json:"status"` // pending, completed
}

type File struct {
	ID            string          `json:"id"`
	FileNumber    string          `json:"fileNumber"`
	CountryPrefix string          `json:"countryPrefix"`
	Client        string          `json:"client"`
	Arrival       string          `json:"arrival"`
	Departure     string          `json:"departure"`
	Nights        int             `json:"nights"`
	Pax           int             `json:"pax"`
	Destination   string          `json:"destination"`
	Services      []ServiceDetail `json:"services"`
	Status        string          `json:"status"` // completed, pending, working, canceled
	Tasks         []Task          `json:"tasks"`
}

var files []File

func main() {
	// Serve static files
	fs := http.FileServer(http.Dir("static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	// Routes
	http.HandleFunc("/", handleIndex)
	http.HandleFunc("/api/files", handleFiles)
	http.HandleFunc("/api/files/create", handleCreateFile)
	http.HandleFunc("/api/files/update", handleUpdateFile)
	http.HandleFunc("/file/", handleFileDashboard)
	http.HandleFunc("/api/search", handleSearch)
	http.HandleFunc("/api/dashboard/stats", handleDashboardStats)
	http.HandleFunc("/api/pending-tasks", handlePendingTasks)

	// Start server
	fmt.Println("Server starting on port 8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleIndex(w http.ResponseWriter, r *http.Request) {
	tmpl := template.Must(template.ParseFiles("templates/index.html"))
	tmpl.Execute(w, files)
}

func handleFiles(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files)
}

func handleCreateFile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var file File
	if err := json.NewDecoder(r.Body).Decode(&file); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	files = append(files, file)
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(file)
}

func handleUpdateFile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var updatedFile File
	if err := json.NewDecoder(r.Body).Decode(&updatedFile); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	for i, file := range files {
		if file.ID == updatedFile.ID {
			files[i] = updatedFile
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(updatedFile)
			return
		}
	}

	http.Error(w, "File not found", http.StatusNotFound)
}

func handleFileDashboard(w http.ResponseWriter, r *http.Request) {
	fileID := r.URL.Path[len("/file/"):]
	var file File
	for _, f := range files {
		if f.ID == fileID {
			file = f
			break
		}
	}

	tmpl := template.Must(template.ParseFiles("templates/file_dashboard.html"))
	tmpl.Execute(w, file)
}

func handleSearch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	query := r.URL.Query().Get("q")
	var results []File
	for _, file := range files {
		if strings.Contains(strings.ToLower(file.FileNumber), strings.ToLower(query)) {
			results = append(results, file)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

func handleDashboardStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	stats := struct {
		Completed int `json:"completed"`
		Pending   int `json:"pending"`
		Working   int `json:"working"`
		Canceled  int `json:"canceled"`
	}{
		Completed: 0,
		Pending:   0,
		Working:   0,
		Canceled:  0,
	}

	for _, file := range files {
		switch file.Status {
		case "completed":
			stats.Completed++
		case "pending":
			stats.Pending++
		case "working":
			stats.Working++
		case "canceled":
			stats.Canceled++
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func handlePendingTasks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var pendingTasks []struct {
		FileNumber string
		Task       Task
	}

	for _, file := range files {
		for _, task := range file.Tasks {
			if task.Status == "pending" {
				pendingTasks = append(pendingTasks, struct {
					FileNumber string
					Task       Task
				}{
					FileNumber: file.FileNumber,
					Task:       task,
				})
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(pendingTasks)
}
