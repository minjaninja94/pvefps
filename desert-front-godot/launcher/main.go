package main

import (
	"archive/zip"
	"bytes"
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"
)

//go:embed payload.zip
var payload embed.FS

func main() {
	if err := run(); err != nil {
		messageBox("Desert Front", "게임을 시작하지 못했습니다.\n\n"+err.Error())
		os.Exit(1)
	}
}

func run() error {
	archive, err := payload.ReadFile("payload.zip")
	if err != nil {
		return err
	}
	sum := sha256.Sum256(archive)
	digest := hex.EncodeToString(sum[:])
	root := os.Getenv("LOCALAPPDATA")
	if root == "" {
		return errors.New("Windows 사용자 저장 폴더를 찾지 못했습니다.")
	}
	base := filepath.Join(root, "DesertFront", "releases")
	target := filepath.Join(base, digest[:20])
	if !complete(target, digest) {
		if err := install(base, target, archive, digest); err != nil {
			return err
		}
	}
	game := exec.Command(filepath.Join(target, "DesertFront.exe"), os.Args[1:]...)
	game.Dir = target
	if err := game.Start(); err != nil {
		return fmt.Errorf("게임 실행 파일을 열 수 없습니다: %w", err)
	}
	if err := game.Wait(); err != nil {
		var exit *exec.ExitError
		if errors.As(err, &exit) {
			return fmt.Errorf("게임이 오류 코드 %d로 종료됐습니다", exit.ExitCode())
		}
		return err
	}
	return nil
}

func complete(dir, digest string) bool {
	marker, err := os.ReadFile(filepath.Join(dir, ".complete"))
	if err != nil || strings.TrimSpace(string(marker)) != digest {
		return false
	}
	for _, name := range []string{"DesertFront.exe", "DesertFront.pck", "online_relay.cfg", "addons/nodetunnel/bin/nodetunnel.dll"} {
		info, err := os.Stat(filepath.Join(dir, filepath.FromSlash(name)))
		if err != nil || info.Size() == 0 {
			return false
		}
	}
	return true
}

func install(base, target string, archive []byte, digest string) error {
	if err := os.MkdirAll(base, 0755); err != nil {
		return err
	}
	stage, err := os.MkdirTemp(base, ".install-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(stage)
	reader, err := zip.NewReader(bytes.NewReader(archive), int64(len(archive)))
	if err != nil {
		return fmt.Errorf("포함된 게임 데이터를 읽지 못했습니다: %w", err)
	}
	for _, entry := range reader.File {
		name := filepath.FromSlash(entry.Name)
		destination := filepath.Join(stage, name)
		relative, err := filepath.Rel(stage, destination)
		if err != nil || relative == ".." || strings.HasPrefix(relative, ".."+string(os.PathSeparator)) || filepath.IsAbs(name) {
			return fmt.Errorf("잘못된 게임 파일 경로: %s", entry.Name)
		}
		if entry.FileInfo().IsDir() {
			continue
		}
		if err := os.MkdirAll(filepath.Dir(destination), 0755); err != nil {
			return err
		}
		source, err := entry.Open()
		if err != nil {
			return err
		}
		output, err := os.OpenFile(destination, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0644)
		if err != nil {
			source.Close()
			return err
		}
		_, copyErr := io.Copy(output, source)
		closeErr := output.Close()
		source.Close()
		if copyErr != nil {
			return copyErr
		}
		if closeErr != nil {
			return closeErr
		}
	}
	if err := os.WriteFile(filepath.Join(stage, ".complete"), []byte(digest+"\n"), 0644); err != nil {
		return err
	}
	if err := os.Rename(stage, target); err != nil && !complete(target, digest) {
		return err
	}
	return nil
}

func messageBox(title, body string) {
	user32 := syscall.NewLazyDLL("user32.dll")
	proc := user32.NewProc("MessageBoxW")
	t, _ := syscall.UTF16PtrFromString(title)
	b, _ := syscall.UTF16PtrFromString(body)
	proc.Call(0, uintptr(unsafe.Pointer(b)), uintptr(unsafe.Pointer(t)), 0x10)
}
