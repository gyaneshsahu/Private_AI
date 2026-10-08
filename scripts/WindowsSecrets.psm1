Set-StrictMode -Version Latest
if (-not $IsWindows) { throw 'Windows Credential Manager requires PowerShell 7 on Windows.' }
if (-not ('PrivateAi.LocalCredentials' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Security;
using System.Text.RegularExpressions;
namespace PrivateAi {
  public static class LocalCredentials {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
    private struct Credential {
      public uint Flags, Type;
      public string TargetName, Comment;
      public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
      public uint BlobSize;
      public IntPtr Blob;
      public uint Persist, AttributeCount;
      public IntPtr Attributes;
      public string TargetAlias, UserName;
    }
    [DllImport("advapi32.dll", EntryPoint="CredWriteW", CharSet=CharSet.Unicode, SetLastError=true)]
    [return: MarshalAs(UnmanagedType.Bool)] private static extern bool Write(ref Credential value, uint flags);
    [DllImport("advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)]
    [return: MarshalAs(UnmanagedType.Bool)] private static extern bool Read(string target, uint type, uint flags, out IntPtr value);
    [DllImport("advapi32.dll", EntryPoint="CredDeleteW", CharSet=CharSet.Unicode, SetLastError=true)]
    [return: MarshalAs(UnmanagedType.Bool)] private static extern bool Delete(string target, uint type, uint flags);
    [DllImport("advapi32.dll")] private static extern void CredFree(IntPtr value);
    private static string Target(string name) {
      if (!Regex.IsMatch(name, @"\A[A-Z][A-Z0-9_]{1,63}\z")) throw new ArgumentException("Invalid credential name.");
      return "PrivateAI/Local/" + name;
    }
    private static Exception Failure() { return new InvalidOperationException("Windows credential operation failed (code " + Marshal.GetLastWin32Error() + ")."); }
    private static void Release(IntPtr ptr) {
      var c = Marshal.PtrToStructure<Credential>(ptr);
      for (int i=0; i<c.BlobSize; i++) Marshal.WriteByte(c.Blob,i,0);
      CredFree(ptr);
    }
    public static void Save(string name, SecureString secret) {
      string target=Target(name);
      if (secret == null || secret.Length == 0 || secret.Length > 1280) throw new ArgumentException("Secret must contain 1–1280 characters.");
      IntPtr ptr=Marshal.SecureStringToBSTR(secret);
      try {
        var c=new Credential { Type=1, TargetName=target, UserName="PrivateAI", Comment="Local development API credential", BlobSize=(uint)(secret.Length*2), Blob=ptr, Persist=2 };
        if (!Write(ref c,0)) throw Failure();
      } finally { Marshal.ZeroFreeBSTR(ptr); }
    }
    public static bool Contains(string name) {
      IntPtr ptr;
      if (!Read(Target(name),1,0,out ptr)) { if(Marshal.GetLastWin32Error()==1168) return false; throw Failure(); }
      Release(ptr); return true;
    }
    public static void Remove(string name) {
      if (!Delete(Target(name),1,0) && Marshal.GetLastWin32Error()!=1168) throw Failure();
    }
    public static void LoadIntoProcess(string name) {
      IntPtr ptr;
      if (!Read(Target(name),1,0,out ptr)) throw Failure();
      try {
        var c=Marshal.PtrToStructure<Credential>(ptr);
        if(c.BlobSize==0 || c.BlobSize>2560 || c.BlobSize%2!=0) throw new InvalidOperationException("Invalid stored credential.");
        Environment.SetEnvironmentVariable(name,Marshal.PtrToStringUni(c.Blob,(int)c.BlobSize/2),EnvironmentVariableTarget.Process);
      } finally { Release(ptr); }
    }
  }
}
'@
}

function Set-PrivateAiSecret {
    param([Parameter(Mandatory)][string]$Name)
    $secret = Read-Host "Enter $Name (masked; stored in Windows Credential Manager)" -AsSecureString
    try { [PrivateAi.LocalCredentials]::Save($Name, $secret) } finally { $secret.Dispose() }
}
function Test-PrivateAiSecret {
    param([Parameter(Mandatory)][string]$Name)
    return [PrivateAi.LocalCredentials]::Contains($Name)
}
function Remove-PrivateAiSecret {
    param([Parameter(Mandatory)][string]$Name)
    [PrivateAi.LocalCredentials]::Remove($Name)
}
function Invoke-WithPrivateAiSecret {
    param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][scriptblock]$Action)
    $previous = [Environment]::GetEnvironmentVariable($Name, 'Process')
    try {
        [PrivateAi.LocalCredentials]::LoadIntoProcess($Name)
        & $Action
    } finally { [Environment]::SetEnvironmentVariable($Name, $previous, 'Process'); $previous = $null }
}
Export-ModuleMember -Function Set-PrivateAiSecret,Test-PrivateAiSecret,Remove-PrivateAiSecret,Invoke-WithPrivateAiSecret
