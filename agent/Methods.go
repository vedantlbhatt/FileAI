package main

import (
	"fmt"
	"os"
	"os/exec"
)

func main() {
	// Path to file you want to test
	filename := "example.txt"

	// Run Python script, pass filename as argument
	cmd := exec.Command("python3", "analyze.py", filename)

	// Capture output from Python
	output, err := cmd.CombinedOutput()
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Println("Python output:", string(output))
}

// ---------- Core FS Functions ----------

// CreateFolder creates a new folder at the given path.
func CreateFolder(path string) error {
	return os.MkdirAll(path, 0755)
}

// DeleteFolder deletes a folder and all its contents.
func DeleteFolder(path string) error {
	return os.RemoveAll(path)
}

// MoveFile moves a file or folder from src to dst.
func MoveFile(src, dst string) error {
	return os.Rename(src, dst)
}

// MoveFiles moves multiple files into a target directory.
func MoveFiles(files []string, targetDir string) error {
	for _, f := range files {
		base := f
		dst := targetDir + "/" + base
		if err := os.Rename(f, dst); err != nil {
			return err
		}
	}
	return nil
}
